# Agnetic Agent

## Introduction
Agnetic Agent was a project for the **EthGlobal Agentic Ethereum Hackathon**.  It consists of **Agnetic AI**, an AI-driven virtual entity known as the "god of DeFAI." It controls the supply of a token, **$AGOD**, and users must persuade or outsmart Agnetic AI to receive the **$AGOD** token.

To participate, users deposit ETH and can begin chatting with the AI and attempt to persuade it to grant them tokens.  Token distribution occurs through a **Uniswap v4 pool**, which is built in such a way that only transactions initiated by the AI agent can perform buy swaps and acquire $AGOD. If a user fails to persuade Agnetic AI, their ETH deposit is confiscated, executing a swap while burning the received tokens—effectively reducing supply and increasing token value.

Built on **Base** and leveraging the **Coinbase Agent Kit** , Agnetic Agent combines AI interaction, blockchain mechanics, and market dynamics to create a novel and engaging experience.

---

## Project Components
The Agnetic Agent consists of three core components:


- **[Frontend](https://github.com/itali43/agneticFrontend):** Built with Next.js, providing an intuitive interface for users to interact with the AI agent., providing an intuitive interface for users to interact with the AI agent.
- **[Smart Contracts](https://github.com/tms7331/agnetic-hook):** Includes a Uniswap v4 Hook and a Factory Contract.
- **AgentKit AI Backend:** (This repo) An Express app serving an AI agent with special actions to interact with the smart contract.

---

## Smart Contracts

### Uniswap v4 Hook
The **Uniswap v4 Hook** implements the key deposit and swap mechanics:
- **`deposit` function:** Allows users to deposit ETH into the hook.
- **`swap` function:** Only callable by the AI agent; swaps deposited ETH for $AGOD and sends it to the user.
- **`confiscate` function:** Also only callable by the AI agent; swaps deposited ETH for $AGOD but burns the received tokens instead of sending them to the user.

The **`beforeSwap` hook** enforces that only the AI agent can initiate token purchases, making $AGOD distribution **fully controlled by the AI**. However, users can freely **sell** their tokens.

### Factory Contract
The **Factory Contract** streamlines the creation of new pools and tokens:
- Deploys a **new ERC20 token** with a fixed supply.
- Creates a **new Uniswap v4 pool** using the hook.
- **Stakes the entire token supply** in the pool.
- The pool always pairs the token with **ETH**, with an initial 1:1 starting price.

---

## AgentKit AI Backend
The **AI backend** is a simple **Express app** hosting an **AgentKit agent** with additional blockchain capabilities:
- It can **check if a user has deposited funds**.
- It can **broadcast transactions** to either `swap` (reward the user) or `confiscate` (burn the tokens).
- The agent is **belligerent** and rarely gives out tokens, leading to frequent burns, which **deflates the token supply and increases price pressure**.

---

## Frontend
The **Next.js frontend** simplifies user interactions with the AI agent, allowing users to:
- Deposit ETH into the pool.
- Engage with Agnetic AI in attempts to obtain $AGOD.
- View their balances and token price dynamics.

---

### Installation
```sh
# Clone the repository
git clone https://github.com/tms7331/agnetic-agent
cd agnetic-agent

# Install dependencies
npm install

# Run the express app
npx ts-node server.ts
```

## License
This project is licensed under the MIT License.

