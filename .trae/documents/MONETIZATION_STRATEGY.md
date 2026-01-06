# Monetization Strategy

## Overview

This document outlines the architectural changes and user flows required to restrict usage and apply a pricing model to the Comment Widget.

## Architecture Shift

To enforce pricing and limits, the system requires a **"Gatekeeper"**—a central control layer that sits between the widget and the data storage.

* **Current State:** Widget $\leftrightarrow$ User's Storage (LocalStorage/Firebase/Supabase)

  * *Limitation:* No central control to count usage or block access.

* **Monetized State:** Widget $\leftrightarrow$ **API Gateway (Gatekeeper)** $\leftrightarrow$ Database

  * *Benefit:* Enables centralized usage tracking, rate limiting, and plan enforcement.

## Proposed User Flow

### Step 1: Registration & API Key

1. **Sign Up:** User visits the marketing site (e.g., `commentwidget.com`) and creates an account.
2. **Plan Selection:** User chooses a plan (e.g., **Free**: 100 comments/mo, **Pro**: Unlimited).
3. **Project Creation:** User creates a project in the dashboard.
4. **Key Generation:** System generates a unique **API Key** (e.g., `cw_live_8392...`) linked to the project and plan.

### Step 2: Integration

The user initializes the widget using the API Key instead of manually configuring a storage adapter.

```javascript
import { initCommentWidget } from '@commentwidget/core';

const widget = initCommentWidget({
  apiKey: 'cw_live_8392...', // Identifies the user and plan
  // The widget automatically uses a 'CloudAdapter' pointing to the managed backend
});
```

### Step 3: Usage & Enforcement

When a visitor attempts to post a comment:

1. **Request:** The widget sends a `POST /comments` request to the managed API (e.g., `api.commentwidget.com`) including the API Key.
2. **Verification (Server-Side):**

   * **Validation:** Is the API Key valid?

   * **Security:** Is the request origin allowed (Domain Whitelisting)?

   * **Quota Check:** Has the user exceeded their monthly comment limit?
3. **Decision:**

   * **Allow:** Save the comment and return `200 OK`.

   * **Block:** Return `402 Payment Required` or `403 Forbidden`.
4. **Feedback:** The widget handles the error and displays a user-friendly message (e.g., *"Comment limit reached. Please contact the site owner."*).

## Pricing Models

Different metrics can be used to define "usage" based on business goals:

| Model              | Technical Implementation                                                                                                          |
| :----------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| **Volume Based**   | Count distinct `createComment` events per billing cycle. Reset counter monthly.                                                   |
| **Seat Based**     | Count unique `author.id`s active within the last 30 days.                                                                         |
| **Project Based**  | Limit the number of active API Keys allowed per account.                                                                          |
| **Feature Gating** | Return a `plan` object during initialization. If `plan: 'free'`, hide features like "Resolve Thread" or "Image Upload" in the UI. |

## "Bring Your Own Database" (BYOD) Strategy

For users who prefer to use their own Firebase or Supabase instances but require a commercial license:

**The "Phone Home" Strategy:**

1. **License Key:** User purchases a license key.
2. **Configuration:**

   ```javascript
   initCommentWidget({
     storage: new FirebaseAdapter(...),
     licenseKey: 'LICENSE_KEY_123'
   })
   ```
3. **Validation:** On initialization, the widget makes a background request to a license server (e.g., `license.commentwidget.com`) to validate the key and domain.
4. **Enforcement:**

   * If invalid/expired, the widget can display a "Powered by CommentWidget (Unlicensed)" badge.

   * Alternatively, it can disable functionality after a grace period.

## Summary

To effectively monetize the Comment Widget, migrating to a **SaaS / Managed Backend** model is recommended. This approach offers:

1. **Total Control:** Strict enforcement of usage limits.
2. **Better UX:** Simplified setup for users (copy-paste API key vs. configuring DB adapters).
3. **Analytics:** Ability to provide users with insights into their comment activity.

