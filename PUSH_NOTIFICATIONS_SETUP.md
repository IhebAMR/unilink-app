# Push Notifications Setup Guide

This guide explains how to set up push notifications for ride reminders in Unilink.

## 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for push notifications. Generate them using the `web-push` library:

```bash
npx web-push generate-vapid-keys
```

This will output:
- **Public Key**: Add this to `.env.local` as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- **Private Key**: Add this to `.env.local` as `VAPID_PRIVATE_KEY` (keep this secret!)
- **Subject**: Add your email or a mailto URL as `VAPID_SUBJECT`

### What is VAPID_SUBJECT?

The `VAPID_SUBJECT` is a contact identifier for your application. It should be:
- **A mailto URL** with your email address: `mailto:your-email@example.com`
- **Or just your email**: `your-email@example.com` (the system will add `mailto:`)

**Examples:**
- `mailto:admin@unilink.app`
- `mailto:contact@yourdomain.com`
- `admin@unilink.app` (will be converted to `mailto:admin@unilink.app`)

This is used to identify your application server to push notification services. Use any valid email address you control.

Example `.env.local`:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:admin@unilink.app
CRON_SECRET=your_secret_key_for_cron_job
```

## 2. Set Up Scheduled Reminders (Cron Job)

The push notification system sends reminders:
- **24 hours before** a ride starts
- **1 hour before** a ride starts

You need to set up a cron job or scheduled task to call the reminder endpoint regularly.

### Option A: Using a Cron Service (Recommended)

Use a service like:
- **Vercel Cron** (if deployed on Vercel)
- **GitHub Actions** (scheduled workflows)
- **External cron service** (cron-job.org, EasyCron, etc.)

Call this endpoint every 15-30 minutes:
```
POST https://your-domain.com/api/push/reminders?secret=YOUR_CRON_SECRET
```

### Option B: Using Node.js Cron (Local Development)

Install `node-cron`:
```bash
npm install node-cron
```

Create a file `scripts/send-reminders.js`:
```javascript
const cron = require('node-cron');
const https = require('https');

// Run every 15 minutes
cron.schedule('*/15 * * * *', () => {
  const url = new URL(process.env.APP_URL + '/api/push/reminders');
  url.searchParams.set('secret', process.env.CRON_SECRET);
  
  https.get(url.toString(), (res) => {
    console.log(`Reminder check: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error('Error sending reminders:', err);
  });
});
```

### Option C: Using Vercel Cron (Production)

If using Vercel, add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/push/reminders?secret=YOUR_CRON_SECRET",
    "schedule": "*/15 * * * *"
  }]
}
```

## 3. How It Works

1. **User Registration**: When users visit the app, they're automatically prompted to allow push notifications (if permission is granted).

2. **Subscription Storage**: Push subscription tokens are stored in the user's `notificationTokens` array in the database.

3. **Reminder Sending**: The cron job checks for upcoming rides and sends push notifications to:
   - Ride owners (drivers)
   - Accepted passengers

4. **Notification Display**: Notifications appear even when the app is closed, thanks to the service worker.

## 4. Testing in Development

### Quick Test Page

Visit `/test-push` in your browser for an interactive testing interface:
- Check VAPID configuration
- Send test notifications to yourself
- Manually trigger ride reminders

### Manual Testing Steps

1. **Set up environment variables** in `.env.local`:
   ```
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
   VAPID_PRIVATE_KEY=your_private_key
   VAPID_SUBJECT=mailto:your-email@example.com
   CRON_SECRET=test-secret-123
   ```

2. **Restart your development server** to load the new environment variables

3. **Visit the app** and allow notification permissions when prompted

4. **Test push notification:**
   - Visit `/test-push` page
   - Click "Send Test Notification"
   - You should receive a notification even if the browser tab is in the background

5. **Test ride reminders:**
   - Create a test ride scheduled for 1 hour from now
   - Visit `/test-push` page
   - Click "Send Reminders for Upcoming Rides"
   - Enter your `CRON_SECRET` when prompted
   - You should receive a reminder notification

### Using cURL (Alternative)

Test the reminder endpoint directly:
```bash
curl -X POST "http://localhost:3000/api/push/reminders?secret=YOUR_CRON_SECRET"
```

Test sending a notification to yourself:
```bash
curl "http://localhost:3000/api/push/test" --cookie "your-session-cookie"
```

## 5. Troubleshooting

- **No notifications received**: Check browser console for errors, verify VAPID keys are correct
- **Invalid subscription errors**: The system automatically removes invalid subscriptions
- **Cron job not running**: Verify the secret key matches and the endpoint is accessible
- **Notifications not showing when app is closed**: Ensure service worker is properly registered

## 6. Security Notes

- Never commit VAPID keys to version control
- Use a strong `CRON_SECRET` to protect the reminder endpoint
- The reminder endpoint requires the secret parameter to prevent unauthorized access

