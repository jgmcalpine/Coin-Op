# CoinOp

**The Coin-Operated Web.**

CoinOp is a non-custodial browser extension for the **Ark Protocol** (Bitcoin Layer 2). It brings the speed and liquidity of Ark directly to the browser, enabling a "MetaMask-like" experience for Bitcoin micropayments without the burden of running a node or managing Lightning channels.

## The Mission

Bitcoin payments on the web are currently stuck in a dichotomy:
1.  **Custodial:** Easy to use (Alby, Wallet of Satoshi), but you don't own your money.
2.  **Self-Hosted:** Sovereign (LND/Core Lightning), but requires complex DevOps, channel balancing, and always-on servers.

**CoinOp** bridges this gap using the **Ark Protocol**. By leveraging Ark's inherent properties—statelessness and unilateral exits—CoinOp delivers a wallet that is:
*   **Instant:** Zero-conf payments via ASPs.
*   **Serverless:** No node required. The wallet lives entirely in the browser via WASM.
*   **Sovereign:** Users hold their own keys and can exit unilaterally to L1 Bitcoin.

## Core Features (Roadmap)

*   **Zero-Config Receive:** Receive Bitcoin instantly via Lightning invoices without opening channels or managing inbound liquidity.
*   **WebLN Bridge:** Implements the standard `window.webln` interface, making it compatible with thousands of existing Lightning apps (Stacker News, Bitrefill) on Day 1.
*   **Privacy First:** Generates fresh VTXOs (Virtual UTXOs) for transactions to prevent linkability, functioning more like digital cash than a bank account.
*   **The Vault:** AES-GCM encrypted local storage ensures private keys never leave the device unencrypted.

## Architecture & Stack

CoinOp is built as a modern Chrome Extension using **Manifest V3**.

*   **Frontend:** React 18, TypeScript, Tailwind CSS.
*   **Build System:** Vite + CRXJS (Hot Reloading).
*   **Protocol:** Ark Labs SDK (compiled to WebAssembly/WASM) for client-side signing and VTXO management.
*   **State Management:** `chrome.storage.local` with strict encryption boundaries between the UI context and the Background Service Worker.

## Security Principles

*   **Non-Custodial:** Keys are generated locally. The ASP never sees private keys.
*   **Air-Gapped:** Webpages interact with the wallet via a restricted API (`window.ark` / `window.webln`). They cannot access the underlying VTXOs or keys.
*   **Strict CSP:** No external scripts allowed. Zero remote code execution.