import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { OlaSplToken } from '../target/types/ola_spl_token'
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'

import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token'

describe("ola-spl-token", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env()
    anchor.setProvider(provider)

    // Metaplex Constants
    const METADATA_SEED = 'metadata'
    const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
        'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
    )

    // Generate a new keypair for the data account for the program
    const dataAccount = anchor.web3.Keypair.generate()
    // Generate a mint keypair
    const mintKeypair = anchor.web3.Keypair.generate()
    const wallet = provider.wallet as anchor.Wallet
    const connection = provider.connection

    console.log('Your wallet address', wallet.publicKey.toString())

    const program = anchor.workspace.OlaSplToken as Program<OlaSplToken>

    // Metadata for the Token
    const tokenTitle = 'My Awesome Token'
    const tokenSymbol = 'MAT'
    const tokenUri = 'https://ipfs.io/ipfs/QmUdt2GvsxtYmBd9S2hAc5tCu2MWtDns9h8rQipSoSxGi1'

    const tokenDecimals = 9

    const mint = mintKeypair.publicKey

    it('Is initialized!', async () => {
        // Initialize data account for the program, which is required by Solang
        const tx = await program.methods
            .new()
            .accounts({ dataAccount: dataAccount.publicKey })
            .signers([dataAccount])
            .rpc()
        console.log('Your transaction signature', tx)
    })

    it('Create an SPL Token!', async () => {
        const [metadataAddress] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(METADATA_SEED),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
        )

        // Create the token mint
        const tx = await program.methods
            .createTokenMint(
                wallet.publicKey, // freeze authority
                tokenDecimals, // decimals
                tokenTitle, // token name
                tokenSymbol, // token symbol
                tokenUri // token uri
            )
            .accounts({
                payer: wallet.publicKey,
                mint: mintKeypair.publicKey,
                metadata: metadataAddress,
                mintAuthority: wallet.publicKey,
                rentAddress: SYSVAR_RENT_PUBKEY,
                metadataProgramId: TOKEN_METADATA_PROGRAM_ID,
            })
            .signers([mintKeypair]) // signing the transaction with the keypair, you actually prove that you have the authority to assign the account to the token program
            .rpc({ skipPreflight: true })
        console.log('Your transaction signature', tx)
    })

    it('Mint some tokens to your wallet!', async () => {
        // Wallet's associated token account address for mint
        // To learn more about token accounts, check this guide out. https://www.quicknode.com/guides/solana-development/spl-tokens/how-to-look-up-the-address-of-a-token-account#spl-token-accounts
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            wallet.payer, // payer
            mintKeypair.publicKey, // mint
            wallet.publicKey // owner
        )
        const numTokensToMint = new anchor.BN(100)
        const decimalTokens = numTokensToMint.mul(
            new anchor.BN(10).pow(new anchor.BN(tokenDecimals))
        )

        const tx = await program.methods
            .mintTo(
                new anchor.BN(decimalTokens) // amount to mint in Lamports unit
            )
            .accounts({
                mintAuthority: wallet.publicKey,
                tokenAccount: tokenAccount.address,
                mint: mintKeypair.publicKey,
            })
            .rpc({ skipPreflight: true })
        console.log('Your transaction signature', tx)
    })
})
