#!/usr/bin/env bash

sudo mkdir -p /usr/share/debsig/keyrings/E2C75D68E6234B07 /etc/debsig/policies/E2C75D68E6234B07
curl -Lvvv "https://proton.me/download/bridge/protonmail-bridge_3.3.0-1_amd64.deb" -o /tmp/protonmail-bridge.deb
curl -Lvvv "https://proton.me/download/bridge/bridge_pubkey.gpg" -o /tmp/bridge_pubkey.gpg
curl -Lvvv "https://proton.me/download/bridge/bridge.pol" -o /tmp/bridge.pol
sudo apt-get install debsig-verify debian-keyring gpg libglx0 libopengl0 libglu1-mesa-dev libxkbcommon-x11-0 pass
gpg --dearmor --output /tmp/debsig.gpg /tmp/bridge_pubkey.gpg
sudo mv /tmp/debsig.gpg /usr/share/debsig/keyrings/E2C75D68E6234B07
sudo cp /tmp/bridge.pol /etc/debsig/policies/E2C75D68E6234B07
debsig-verify /tmp/protonmail-bridge.deb && \
    sudo DEBIAN_FRONTEND=noninteractive apt-get -y install /tmp/protonmail-bridge.deb && \
    rm -Rf /tmp/protonmail-bridge.deb