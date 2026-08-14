module.exports = {
    env: {
        indexerKey: process.env.INDEXER_KEY || process.env.indexerKey || "",
        publicPinata: process.env.PINATA_PUBLIC || process.env.publicPinata || "",
        privatePinata: process.env.PINATA_SECRET || process.env.privatePinata || "",
        discordWebhook: process.env.DISCORD_WEBHOOK || process.env.discordWebhook || "",
        discordCouncilWebhook: process.env.DISCORD_COUNCIL_WEBHOOK || process.env.discordCouncilWebhook || "",
        discordErrorWebhook: process.env.DISCORD_ERROR_WEBHOOK || process.env.discordErrorWebhook || "",
        rewardWebhook: process.env.REWARD_WEBHOOK || process.env.rewardWebhook || "",
        testDiscordWebhook: process.env.TEST_DISCORD_WEBHOOK || process.env.testDiscordWebhook || "",
        newRaffleWebhook: process.env.NEW_RAFFLE_WEBHOOK || process.env.newRaffleWebhook || "",
        raffleWinnersWebhook: process.env.RAFFLE_WINNERS_WEBHOOK || process.env.raffleWinnersWebhook || ""

      },

}
