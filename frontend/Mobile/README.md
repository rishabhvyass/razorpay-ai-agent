# 📱 Checkout Concierge — React Native CLI Mobile Application

An AI-native conversational commerce mobile application built with **React Native (CLI)**, **TypeScript**, **React Navigation**, **TanStack Query**, **Zustand**, and a centralized **Hardware-Accelerated Motion System**.

---

## ✨ Key Mobile Features

1. **Floating Stadium Capsule Navigation**:
   - `Products`: Live catalog grid with category filters, instant keyword search, and staggered item reveal.
   - `AI`: Direct conversational AI assistant with instant query routing, product carousels, voice search, and prompt suggestions.
   - `Order`: Real-time order tracking, status badges (`PAID`, `PENDING`), and transaction audit trail.

2. **Premium Motion & Physics System**:
   - **Centralized Tokens** in `src/theme/motion.ts` (durations: 80ms–550ms, spring physics: `gentle`, `snappy`, `subtle`).
   - **100% UI-Thread Native Acceleration** (`useNativeDriver: true`) running smoothly at 60fps.
   - **Accessibility Reduce-Motion Compliance** (`useReduceMotion.ts`) automatically honoring user OS preferences.
   - **Interactive Animated Components**:
     - `ThinkingIndicator`: Purple stadium pill with 3 staggered animated bouncing dots.
     - `PulsingRing`: Ambient breathing halo for AI avatar and microphone active state.
     - `VoiceWaveform`: Equalizing 8-bar audio frequency bars.
     - `PaymentVerificationAnimation`: Rotating progress ring with central security lock.
     - `PaymentSuccessAnimation`: Multi-stage reveal (expanding circle ➔ checkmark ➔ amount ➔ order details).

3. **Guarded Checkout & Razorpay Test Mode**:
   - Explicit human-in-the-loop purchase authorization screen before any payment link is issued.
   - Test mode sandbox support for UPI, QR codes, test cards, and netbanking.

---

## 🚀 Setup & Running

### 1. Install Dependencies
```bash
cd frontend/Mobile
npm install
```

### 2. iOS Setup (CocoaPods)
```bash
cd ios
pod install
cd ..
```

### 3. Configure Backend Host
- **iOS Simulator**: Defaults to `http://localhost:3001`.
- **Android Emulator**: Uses `http://10.0.2.2:3001` automatically.
- **Physical Device**: Set your local Wi-Fi IP address in `src/services/config.ts`:
  ```typescript
  const CUSTOM_LAN_HOST = '192.168.1.XX';
  ```

### 4. Launch the App
```bash
# Start Metro bundler
npm start

# Run on iOS Simulator
npm run ios

# Run on Android Emulator
npm run android
```

### 5. Type Checking
```bash
npx tsc --noEmit
```

---

## 💳 Razorpay Test Mode Credentials

| Payment Method | Test Details |
|---|---|
| **UPI / QR** | Any VPA: `success@razorpay` (or scan QR code) |
| **Card Number** | `4111 2222 3333 4444` |
| **Expiry / CVV** | Any future date (e.g. `12/28`), CVV: `123` |
| **OTP** | `123456` |
