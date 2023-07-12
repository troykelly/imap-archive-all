import { ImapFlow, ImapFlowOptions } from "imapflow";
import moment from "moment";
import cliProgress from 'cli-progress';

/** Contains environment variables for an IMAP account. */
interface Env {
    IMAP_USERNAME: string;
    IMAP_PASSWORD: string;
    IMAP_HOST: string;
    IMAP_PORT: string;
    IMAP_SECURITY: string;
    IMAP_DEBUG: string;
    IMAP_BATCH_SIZE: string;
    IMAP_CONNECTION_TIMEOUT: string;
    IMAP_GREETING_TIMEOUT: string;
    IMAP_SOCKET_TIMEOUT: string;
    IMAP_DISABLE_PROGRESS_BAR: string;
}

/** Stores environment variables provided in the current running process. */
const env: Env = process.env as any;

/** Defines the batch size for processing emails. The user is allowed to set this value by providing the IMAP_BATCH_SIZE environment variable. */
const BATCH_SIZE = Number(env.IMAP_BATCH_SIZE) || 500;

/** Disables progress bar when set to true */
const DISABLE_PROGRESS_BAR = env.IMAP_DISABLE_PROGRESS_BAR === 'true';

/** Enhances ImapFlowOptions with timeout settings. */
interface CustomImapFlowOptions extends ImapFlowOptions {
    connectionTimeout?: number;
    greetingTimeout?: number;
    socketTimeout?: number;
}

/**
 * Returns the enhanced IMAP configuration for the email server.
 * @returns The enhanced IMAP configuration object.
 */
function getImapConfiguration(): CustomImapFlowOptions {
    const logger = {
        error: console.error,
        warn: console.warn,
        info: env.IMAP_DEBUG ? console.info : () => { },
        debug: env.IMAP_DEBUG ? console.debug : () => { }
    };

    return {
        host: env.IMAP_HOST || "127.0.0.1",
        port: Number(env.IMAP_PORT || "1143"),
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
        connectionTimeout: Number(env.IMAP_CONNECTION_TIMEOUT) || 90000,
        greetingTimeout: Number(env.IMAP_GREETING_TIMEOUT) || 16000,
        socketTimeout: Number(env.IMAP_SOCKET_TIMEOUT) || 300000,
    };
}

/**
 * Fetches emails older than one week in batches.
 * @param connection The client used to connect to the IMAP server.
 * @param startSeq The sequence number to start fetching from. 
 * @returns A promise that resolves to an array of email IDs.
 */
async function fetchEmails(connection: ImapFlow, startSeq: number = 1): Promise<number[]> {
    const oneWeekAgo: Date = moment().subtract(1, 'weeks').startOf('day').toDate();
    const searchCriteria: unknown = { before: oneWeekAgo, seq: `${startSeq}:${startSeq + BATCH_SIZE - 1}` };

    DISABLE_PROGRESS_BAR && console.log("💭 Fetching emails received before", oneWeekAgo.toISOString());
    const messages: number[] = await connection.search(searchCriteria);
    DISABLE_PROGRESS_BAR && console.log("💌 No. of emails fetched:", messages.length);
    return messages;
}

/**
 * Moves emails to the Archive folder in batches.
 * @param connection The client used to connect to the IMAP server.
 * @param emails An array containing the IDs of the emails to be moved.
 * @returns A promise that resolves when all emails have been moved.
 */
async function moveEmailsToArchive(connection: ImapFlow, emails: number[], batchProgressBar: cliProgress.SingleBar): Promise<void> {
    let index = 0;
    const mailboxes = await connection.list();
    const archiveExists = mailboxes.some(mailbox => mailbox.path.toLowerCase() === "archive");

    if (!archiveExists) {
        console.error("❌ 'Archive' mailbox does not exist.");
        return;
    }

    !DISABLE_PROGRESS_BAR && batchProgressBar.start(emails.length, 0);

    while (index < emails.length) {
        const batch = emails.slice(index, index + BATCH_SIZE);
        DISABLE_PROGRESS_BAR && console.log("📤 Moving emails in batch starting at index:", index);
        try {
            await connection.messageMove(batch, "Archive");
            !DISABLE_PROGRESS_BAR && console.log(`✅ Batch starting from index ${index} moved successfully.`);
            index += BATCH_SIZE;
        } catch (err) {
            console.error("❌ Error moving batch:", err);
        }

        // update progress bars
        const currentBatchEmailsMoved = index + BATCH_SIZE;
        !DISABLE_PROGRESS_BAR && batchProgressBar.update(currentBatchEmailsMoved);
    }

    !DISABLE_PROGRESS_BAR && batchProgressBar.stop();
}

/**
 * Main function that connects to IMAP server, fetches and moves old emails to Archive.
 */
async function main() {
    const config: CustomImapFlowOptions = getImapConfiguration();
    const client = new ImapFlow(config);

    const totalProgressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    const batchProgressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

    let totalEmailsMoved = 0;
    let estimatedTotalEmails = 0;

    !DISABLE_PROGRESS_BAR && console.log("🚀 Starting IMAP Archiver...");

    try {
        const oneWeekAgo: Date = moment().subtract(1, 'weeks').startOf('day').toDate();

        await client.connect();
        !DISABLE_PROGRESS_BAR && console.log("🔗 Connected to IMAP server.");
        await client.mailboxOpen("INBOX");
        !DISABLE_PROGRESS_BAR && console.log("📬 Opened INBOX.");

        // Get the estimated total number of emails that will be moved
        const mailboxStatus = await client.status("INBOX", { messages: true });
        estimatedTotalEmails = mailboxStatus.messages;

        !DISABLE_PROGRESS_BAR && totalProgressBar.start(estimatedTotalEmails, 0);

        let startSeq = 1;
        while (true) {
            const emails = await fetchEmails(client, startSeq);
            if (emails.length) {
                await moveEmailsToArchive(client, emails, batchProgressBar);
                totalEmailsMoved += emails.length;
            } else {
                break;
            }
            startSeq += BATCH_SIZE;
        }

        !DISABLE_PROGRESS_BAR && totalProgressBar.stop();
        !DISABLE_PROGRESS_BAR && console.log(`🎉 Successfully moved ${totalEmailsMoved} old emails!`);
    } catch (err) {
        console.error("❌ Error during the process:", err);
    } finally {
        await client.logout();
        !DISABLE_PROGRESS_BAR && console.log("👋 Logged out of the IMAP server, bye!");
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1); // Handle unhandled promise rejections
});