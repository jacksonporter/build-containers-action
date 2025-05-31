#! /usr/bin/env bash

echo "Sleeping for 5 seconds"
sleep 5

echo "[Mise] Trusting this directory"
${HOME}/.local/bin/mise trust --all

echo "[Mise] Installing tools"
${HOME}/.local/bin/mise install

echo "[Mise/Environment] Setting last dev environment"
echo 'dev-container' > .last-dev-env

echo "[Mise] Setting experimental flag"
${HOME}/.local/bin/mise settings experimental=true

echo "Sleeping for 5 seconds"
sleep 5

echo "[Mise] Installing dependencies"
${HOME}/.local/bin/mise run 'install'
