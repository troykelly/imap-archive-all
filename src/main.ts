import { ImapFlow, ImapFlowOptions } from "imapflow";
import moment from "moment";

/** Defines the batch size for processing emails. */
const BATCH_SIZE = 500;

/** Contains environment variables for an IMAP account. */
interface Env {
    IMAP_USERNAME: string;
    IMAP_PASSWORD: string;
    IMAP_HOST: string;
    IMAP_PORT: string;
    IMAP_SECURITY: string;
    IMAP_DEBUG: string;
}

/** Stores environment variables provided in the current running process */
const env: Env = process.env as any;

/** Configuration interface for an IMAP server. */
interface ImapConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    tls: {
        rejectUnauthorized: boolean;
        minVersion: string;
    };
}

/**
 * Returns the IMAP configuration for the email server.
 * @returns The IMAP configuration object.
 */
function getImapConfiguration(): ImapFlowOptions {
    const logger = env.IMAP_DEBUG
        ? {
            error: console.error,
            warn: console.warn,
            info: console.info,
            debug: console.debug
        } : {
            error: console.error,
            warn: console.warn,
            info: () => { },  // Change this
            debug: () => { }  // Change this
        };

    return {
        host: env.IMAP_HOST || "127.0.0.1",
        port: +(env.IMAP_PORT || "1143"),
        secure: (env.IMAP_SECURITY || "STARTTLS").toUpperCase() !== "STARTTLS",
        auth: {
            user: env.IMAP_USERNAME,
            pass: env.IMAP_PASSWORD,
        },
        tls: {
            rejectUnauthorized: false,
            minVersion: "TLSv1",
        },
        logger,
        emitLogs: false,
    };
}

/**
 * Fetches emails older than one week in batches.
 * @param connection The client used to connect to the IMAP server. 
 * @returns A promise that resolves to an array of email IDs.
 */
async function fetchEmails(connection: ImapFlow): Promise<number[]> {
    const oneWeekAgo: Date = moment().subtract(1, 'weeks').startOf('day').toDate();
    const searchCriteria: any = { before: oneWeekAgo };

    console.log("💭 Fetching emails received before", oneWeekAgo);
    const messages: number[] = await connection.search(searchCriteria);
    console.log("💌 No. of emails fetched:", messages.length);
    return messages;
}

/**
 * Moves emails to the Archive folder in batches.
 * @param connection The client used to connect to the IMAP server.
 * @param emails An array containing the IDs of the emails to be moved.
 * @returns A promise that resolves when all emails have been moved.
 */
async function moveEmailsToArchive(connection: ImapFlow, emails: number[]): Promise<void> {
    let index = 0;
    while (index < emails.length) {
        const batch = emails.slice(index, index + BATCH_SIZE);
        console.log("📤 Moving emails batch starting at index:", index);
        await connection.messageMove(batch, "Archive");
        index += BATCH_SIZE;
        console.log(`✅ Batch starting from index ${index} moved successfully to Archive.`);
    }
}

/**
 * Main function that connects to an IMAP server, fetches and moves old emails to Archive.
 */
async function main() {
    const config: ImapFlowOptions = getImapConfiguration();

    const client = new ImapFlow(config);

    console.log("🚀 Starting IMAP Archiver...");

    try {
        await client.connect();
        console.log("🔗 Connected to IMAP server.");
        await client.mailboxOpen("INBOX");
        console.log("📬 Opened INBOX.");
        const emails = await fetchEmails(client);
        if (emails.length) {
            await moveEmailsToArchive(client, emails);
            console.log("🎉 Successfully moved all old emails to Archive!");
        } else {
            console.log("🎉 No old emails found to move. Done!");
        }
    } finally {
        await client.logout();
        console.log("👋 Logged out of the IMAP server, bye!");
    }
}

main().catch(console.error);
