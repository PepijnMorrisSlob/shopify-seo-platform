# DataForSEO Setup Guide

## Quick Setup (5 minutes)

### Step 1: Sign Up for DataForSEO

1. Go to: https://dataforseo.com/
2. Click **"Sign Up"** (top right)
3. Fill in your details:
   - Email address
   - Password
   - Company name (can be anything)
4. Click **"Create Account"**

---

### Step 2: Get Your Free Credits

✅ **$1 free credit** automatically added to new accounts
✅ This gives you ~100 API calls to test
✅ No credit card required for testing

---

### Step 3: Get Your API Credentials

1. **Login** to your DataForSEO dashboard
2. Go to **"API Access"** in the left sidebar
3. You'll see:
   - **Login:** Your email address (or username)
   - **Password:** Your account password (or generate API password)

**IMPORTANT:** Some users see an API-specific password. Use that instead of your account password.

---

### Step 4: Add Credentials to Your .env File

Open: `C:\Users\pepij\shopify-seo-platform\backend\.env`

Update these lines:

```bash
DATAFORSEO_LOGIN=your_email@example.com
DATAFORSEO_PASSWORD=your_password_or_api_password
```

**Example:**
```bash
DATAFORSEO_LOGIN=john@example.com
DATAFORSEO_PASSWORD=mySecureP@ssw0rd123
```

---

### Step 5: Test Your Credentials

Once you have the app running, test DataForSEO integration:

```powershell
# In your backend directory
cd C:\Users\pepij\shopify-seo-platform\backend

# Start backend
npm run dev

# In another terminal, test the API
curl http://localhost:3000/api/test/dataforseo
```

---

## What You Get with DataForSEO

### **Keyword Research:**
- Search volume (monthly searches)
- Keyword difficulty (0-100 score)
- CPC (cost per click for ads)
- Competition level
- Related keywords (LSI keywords)

### **SERP Analysis:**
- Top 100 ranking pages for any keyword
- Featured snippets detection
- "People Also Ask" questions
- Related searches
- SERP features (videos, images, shopping)

### **Competitor Analysis:**
- Competitor keyword gaps
- Domain keyword rankings
- Organic traffic estimates

---

## Pricing (After Free Credits)

**Pay-as-you-go pricing:**

| API Endpoint | Cost |
|-------------|------|
| Keyword Research | $0.15 per 100 keywords |
| SERP Analysis | $0.30 per request |
| Keyword Suggestions | $0.05 per request |
| Domain Analysis | $0.50 per domain |

**Example Monthly Costs:**
- Light usage (testing): $10-20/month
- Moderate usage (10-20 customers): $50-100/month
- Heavy usage (50+ customers): $200-500/month

**No monthly subscription required** - only pay for what you use.

---

## API Limits

✅ **No rate limits** on pay-as-you-go plans
✅ **Unlimited API calls** (you just pay per call)
✅ **Real-time data** (SERP data updated daily)
✅ **Historical data** available

---

## Adding Credits

When your free $1 runs out:

1. **Go to Dashboard** → "Billing"
2. **Add Payment Method** (credit card)
3. **Add Credits** ($10 minimum)
4. **Auto-recharge** available (optional)

---

## Common Issues

### "Authentication failed"
- ✅ Check email/password are correct
- ✅ Check if there's an API-specific password in dashboard
- ✅ Make sure no extra spaces in .env file

### "Insufficient credits"
- ✅ Add $10 credits to your account
- ✅ Check balance in dashboard

### "Invalid location code"
- ✅ Use location codes from: https://docs.dataforseo.com/v3/serp/google/locations/
- ✅ Example: `2840` for United States

---

## DataForSEO Dashboard

**Monitor your usage:**
- https://app.dataforseo.com/

**Check:**
- ✅ Current balance
- ✅ API calls made
- ✅ Cost per call
- ✅ Historical usage

---

## Support

**DataForSEO Support:**
- Email: support@dataforseo.com
- Live Chat: https://dataforseo.com/
- Documentation: https://docs.dataforseo.com/

**Response Time:** Usually within 24 hours

---

## Next Steps After Setup

Once you have DataForSEO credentials in your `.env`:

1. ✅ Start your backend server
2. ✅ Test keyword research in the app
3. ✅ Generate SEO content with real keyword data
4. ✅ Analyze SERP results for your target keywords

---

**Ready to get started?** Sign up at: https://dataforseo.com/

Then update your credentials in `backend\.env` and you're good to go! 🚀
