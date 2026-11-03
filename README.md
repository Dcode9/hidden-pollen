# Hidden Pollen

A steganography studio about messages hidden in images, built on Pollinations.

Live app: https://hidden-pollen.vercel.app

## Two ways to hide a message

**1. LSB studio (free, no account)** - classic least-significant-bit steganography. Type a message, hide it in a PNG entirely in your browser, download it, and reveal it later. Nothing leaves your device.

**2. Fable mode (BYOP)** - a live reproduction of the experiment from [How does Fable 5.1 hide messages in images?](https://www.lesswrong.com/posts/WHEQps5PK8LrrcTAb/how-does-fable-5-1-hide-messages-in-images): the app asks a Pollinations LLM to draw an SVG picture with your secret hidden in it, then hands only the picture to a fresh, stateless session and asks whether anything is hidden and what it says.

Fable mode calls `gen.pollinations.ai/v1/chat/completions` and is powered by **Pollinations Pay (BYOP)**: click Connect, approve the app, and the requests are billed to your own Pollen balance. The app never sees a shared key - the scoped user key lives in `sessionStorage` only (handled by the official `<polli-connect>` component).

## Files

- `index.html` / `app.js` - UI
- `stego.js` - LSB encode/decode engine (no dependencies)
- `fable.js` - Fable-mode LLM hide/detect over the Pollinations API
- `stego.test.js` - `node --test` roundtrip tests for the LSB engine

## Quest

Built for pollinations/pollinations#18367.
