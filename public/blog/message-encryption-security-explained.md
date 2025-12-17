---
title: 'How Your Messages Stay Private on SpokeToWork'
author: SpokeToWork Team
date: 2025-12-10
slug: message-encryption-security-explained
tags:
  - security
  - privacy
  - encryption
  - messaging
categories:
  - security
  - features
excerpt: 'Your messages are encrypted so only you and your recipient can read them. Learn how end-to-end encryption protects your job search conversations.'
featuredImage: /blog-images/message-encryption-security-explained/featured.svg
featuredImageAlt: 'Lock icon representing end-to-end encrypted messaging'
ogImage: /blog-images/message-encryption-security-explained/featured-og.png
ogTitle: 'How Your Messages Stay Private on SpokeToWork'
ogDescription: 'End-to-end encryption means only you and your recipient can read your messages. Not even we can see them.'
twitterCard: summary_large_image
---

# How Your Messages Stay Private on SpokeToWork

When you're job hunting, you might share sensitive information - salary expectations, interview feedback, or personal challenges. SpokeToWork protects these conversations with **end-to-end encryption (E2E)**, the same security used by Signal and WhatsApp.

## What Does "End-to-End Encrypted" Mean?

**Simple answer**: Only you and the person you're messaging can read your messages. Nobody else - not us, not hackers, not anyone.

Here's how it works in plain terms:

1. **Your message gets scrambled** on your device before it leaves
2. **Only scrambled text travels** over the internet and sits on our servers
3. **Your recipient's device unscrambles it** using a key only they have

Even if someone broke into our database, they'd find gibberish - encrypted text that's useless without the decryption keys, which we never have.

---

## How SpokeToWork Compares to Other Apps

![Encryption comparison chart](/blog-images/message-encryption-security-explained/comparison-chart.png)
_How different messaging apps handle your privacy_

| Feature                       | SpokeToWork | Standard Email | Social Media DMs |
| ----------------------------- | ----------- | -------------- | ---------------- |
| End-to-End Encrypted          | Yes         | No             | Usually No       |
| Server Can Read Messages      | No          | Yes            | Yes              |
| Your Data Sold to Advertisers | No          | Often          | Yes              |
| Open Source Security          | Yes         | Varies         | No               |

---

## The Technical Details (For the Curious)

If you're interested in how the encryption actually works, here's the breakdown:

### Key Exchange: ECDH P-256

When you connect with someone, your devices perform a mathematical handshake called **Elliptic Curve Diffie-Hellman (ECDH)**. This creates a shared secret that only your two devices know - without ever sending the secret over the internet.

### Message Encryption: AES-GCM-256

Each message is encrypted using **AES-GCM** with a 256-bit key. This is the same encryption standard used by banks and governments. Each message gets a unique random value (called an IV) so even identical messages look different when encrypted.

### Password-Derived Keys: Argon2id

Your encryption keys are derived from your password using **Argon2id**, a memory-hard algorithm that's resistant to brute-force attacks. This means:

- Same password always generates the same keys
- You can access your messages from any device by logging in
- Changing your password rotates your keys

### What We Store vs. What We Don't

| We Store                                       | We Don't Store     |
| ---------------------------------------------- | ------------------ |
| Your public key (for others to encrypt to you) | Your private key   |
| Encrypted message content (ciphertext)         | Decrypted messages |
| Message timestamps                             | Message content    |
| Your profile info                              | Your password      |

---

## Why This Matters for Job Seekers

During a job search, you might discuss:

- **Salary negotiations** - What you're making, what you want
- **Interview experiences** - Honest feedback about companies
- **Personal situations** - Why you're leaving, health issues, family needs
- **References** - People vouching for you privately

This information is sensitive. With end-to-end encryption, you can share freely knowing that your conversations are private - even from us.

---

## Common Questions

### Can SpokeToWork read my messages?

**No.** We literally cannot decrypt your messages. We don't have the keys.

### What if I forget my password?

Your encryption keys are derived from your password. If you reset your password, you'll generate new keys. You'll still be able to start new conversations, but old messages encrypted with your previous keys won't be recoverable.

### Is this as secure as Signal?

We use the same cryptographic primitives (ECDH, AES-GCM) and the same zero-knowledge architecture. The main difference is that Signal has been audited by third-party security researchers, while SpokeToWork is newer. Our code is open source, so you can verify the implementation yourself.

### What about metadata?

We can see _that_ you messaged someone and _when_, but not _what_ you said. This is similar to how your phone company can see you made a call but can't hear the conversation.

---

## The Bottom Line

Your job search conversations are private. End-to-end encryption ensures that only you and your recipient can read your messages - not us, not advertisers, not anyone else.

Want to learn more about our security practices? Check out our [Security Architecture documentation](https://github.com/TortoiseWolfe/SpokeToWork/blob/main/docs/SECURITY-ARCHITECTURE.md) on GitHub.

---

_Have questions about security? Reach out through our contact page._
