# IMAP Archive All

A simple utility script that automatically archives all your emails received before the previous week from your IMAP inbox to the IMAP Archive folder. The script is written in TypeScript and uses the [ImapFlow](https://imapflow.com/) library for connecting to IMAP servers. It provides flexibility in specifying the batch size and timeouts to cater to a wide range of server configurations and performance constraints.

## Why

[Proton Mail](https://protonmail.com/) is notable for its focus on security and privacy. However, managing a substantial mailbox (>10,000 emails) can be challenging due to the lack of 'archive all' or 'mark all read' features. With a mailbox containing more than 300,000 emails, Android clients may experience difficulty sending emails or saving drafts.

This script helps by moving all Inbox emails to Archive in controlled batches to avoid overwhelming your mailbox. This potentially improves your Proton Mail client's performance. The size of the batches and the interval between them can be adjusted to best match your server's capabilities.

## Proton Mail Bridge

If you're a Proton Mail user, you'll need to set up the [Proton Mail Bridge](https://protonmail.com/bridge/) to use this script, as it allows IMAP/SMTP email clients to connect to Proton Mail servers. 

To get it operational:

1. Download and install the Bridge software from the [official Proton Mail Bridge page](https://protonmail.com/bridge/install).
2. Log in to Proton Mail via the Bridge interface.
3. You will be able to view the IMAP/SMTP information (host, port, etc.) required to connect your mail client to the Proton Mail servers via Bridge. Use this information to fill the corresponding environment variables (`IMAP_USERNAME`, `IMAP_PASSWORD`, `IMAP_HOST`, `IMAP_PORT`, `IMAP_SECURITY`).

*Note*: Remember, when using Proton Mail Bridge, `IMAP_USERNAME` and `IMAP_PASSWORD` are not your regular Proton Mail login credentials. Instead, they are the login credentials displayed by Proton Mail Bridge.

## Getting Started

### Requirements

* NodeJS (Version 18 or higher recommended)
* Yarn

### Installation

* Clone the repository into your local machine
* Install the dependencies with yarn:

```bash
$ yarn install
```

## Usage

#### First, set your IMAP configurations in the environment variables:

```bash
export IMAP_USERNAME=my@email.com
export IMAP_PASSWORD=secretpassword
export IMAP_HOST=127.0.0.1
export IMAP_PORT=1143
export IMAP_SECURITY=STARTTLS // Or 'SSL/TLS'
export IMAP_BATCH_SIZE=500 // The number of emails fetched/moved in one batch. Default is 500.
export IMAP_CONNECTION_TIMEOUT=90000 // Milliseconds waiting for the connection to establish. Default is 90000 (90 seconds).
export IMAP_GREETING_TIMEOUT=16000 // Milliseconds waiting for the greeting after the connection is established. Default is 16000 (16 seconds).
export IMAP_SOCKET_TIMEOUT=300000 // Milliseconds of inactivity to allow. Default is 300000 (5 minutes).
```

Be aware that `IMAP_USERNAME` and `IMAP_PASSWORD` are sensitive pieces of information. Handle them with care; don't hard-code them into your scripts or expose them in your shell's history. Consider storing these values securely or use tools to handle them safely (like encrypted environment variables).

#### Additionally, you can set `IMAP_DEBUG=true` in your environment variables to enable debugging logs.

#### Then, run the script:

```bash
$ yarn start
```

The script will connect to the specified IMAP server, fetch all emails received before the previous week in the inbox, and then moves those emails to the Archive folder in batches.

## Docker

A Docker image for the script is automatically created for every new release using GitHub Actions. The image is hosted on GitHub's Container Registry.

#### To pull the Docker image:

```bash
docker pull ghcr.io/troykelly/imap-archive-all:latest
```

#### To run the Docker image:

Since Proton Mail Bridge only listens to localhost (127.0.0.1), you have to use Docker's `host.docker.internal` feature to access the Bridge from within the Docker container.

```bash
docker run --rm -it \
  --add-host=host.docker.internal:host-gateway \
  -e IMAP_USERNAME=my@email.com \
  -e IMAP_PASSWORD=secretpassword \
  -e IMAP_HOST=host.docker.internal \
  -e IMAP_PORT=1143 \
  -e IMAP_SECURITY=STARTTLS \
  -e IMAP_BATCH_SIZE=500 \
  -e IMAP_CONNECTION_TIMEOUT=90000 \
  -e IMAP_GREETING_TIMEOUT=16000 \
  -e IMAP_SOCKET_TIMEOUT=300000 \
  ghcr.io/troykelly/imap-archive-all:latest
```

Remember to replace `my@email.com` and `secretpassword` with your Proton Mail Bridge credentials.

## Development

We welcome contributions! If you have a feature request, bug report, or have prepared a patch, please open a new issue or pull request.

## License

This project is licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).