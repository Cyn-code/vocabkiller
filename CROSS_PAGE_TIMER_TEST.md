# 🕒 Cross-Page Timer Testing Guide

## ✅ **What Should Work Now**

Your timer now tracks **total active time across ALL pages**:
- **Homepage** (React app)
- **About page** (`/about`)
- **Privacy page** (`/privacy`) 
- **Learn Original Text** (`/learn-original-text-subpage.html`)
- **Learn All Unique Words** (`/learn-all-unique-words.html`)
- **Learn Sentences** (`/learn-sentences-with-unique-words.html`)

## 🧪 **Step-by-Step Test**

### **Test 1: Homepage → Subpage Timing**
1. **Visit** `https://vocabkiller.com`
2. **Use the app** for 20 seconds (scroll, click, type)
3. **Check debug panel** - should show ~20s active time
4. **Click "About"** or any navigation link
5. **Use the About page** for 20 seconds (scroll, read)
6. **Check debug panel** - should show ~40s total active time
7. **Continue until 1 minute** - ad should trigger

### **Test 2: Subpage → Subpage Timing**
1. **Start on** `/about` page directly
2. **Use the page** for 30 seconds
3. **Navigate to** `/privacy` page
4. **Use for another 30 seconds**
5. **Timer should show 1 minute** and redirect to homepage with ad

### **Test 3: Learning Subpages**
1. **Visit any learning subpage** directly:
   - `/learn-original-text-subpage.html`
   - `/learn-all-unique-words.html` 
   - `/learn-sentences-with-unique-words.html`
2. **Use the page** for 45 seconds
3. **Navigate to homepage** 
4. **Use homepage** for 15+ seconds
5. **Ad should trigger** after 1 minute total

## 📊 **Debug Panel Verification**

### **What to Look For:**
- **Same timer values** across all pages
- **Continuous counting** when navigating
- **No timer resets** between pages
- **Debug panels show identical data**

### **Debug Panel Locations:**
- **Homepage**: Bottom-left corner (React component)
- **All Subpages**: Bottom-left corner (vanilla JS)

### **Expected Debug Info:**
```
Ad System Debug (/about)
Active Time: 0m 45s
Until Ad: 0m 15s  
Status: Active
Ad Watched: No
[Reset Timer] [Go Home]
```

## 🔍 **Console Logs to Watch**

Open browser dev tools and look for:

```javascript
📊 [Universal] Loaded activity state: {activeTime: "0m 30s", ...}
🆕 [Universal] Initialized new activity state on /about
🎯 [Universal] Ad prompt triggered! Active time: 1m 0s
🔄 [Universal] Ad timer reset
```

## 🌐 **Cross-Page Flow Test**

### **Complete User Journey:**
1. **Homepage** (20s) → **About** (20s) → **Privacy** (20s) → **Ad triggers**
2. **Learning page** (30s) → **Homepage** (30s) → **Ad triggers**
3. **Any subpage** (50s) → **Another subpage** (10s) → **Ad triggers**

### **Expected Behavior:**
- ✅ Timer continues across all navigation
- ✅ Debug panels show same values everywhere
- ✅ Ad triggers after exactly 1 minute total active time
- ✅ Subpages redirect to homepage for ad display
- ✅ Returns to original page after watching ad

## 🚨 **Troubleshooting**

### **If Timer Resets Between Pages:**
- Check browser console for script loading errors
- Verify `universal-activity-tracker.js` loads on all pages
- Check localStorage for `vocabkiller_activity_state`

### **If Debug Panels Show Different Values:**
- Refresh the page and check again
- Clear localStorage and restart test
- Check console for synchronization errors

### **If Ad Doesn't Trigger:**
- Verify timer reaches 1 minute (60000ms)
- Check `adWatched` flag in localStorage
- Look for redirect logs in console

## 📱 **Mobile Testing**

Test on mobile devices:
- **Touch interactions** should count as activity
- **Scrolling** should increment timer
- **Page navigation** should maintain timer state
- **Debug panels** should be visible and functional

## 🎯 **Success Criteria**

### ✅ **Working Correctly:**
- Timer shows **continuous counting** across all pages
- **Same values** in debug panels on different pages
- **Ad triggers** after exactly 1 minute total active time
- **Smooth navigation** without timer interruption
- **Proper redirects** from subpages to homepage for ads

### ❌ **Needs Investigation:**
- Timer resets to 0 when changing pages
- Different values shown on different pages
- Ad triggers multiple times or not at all
- Console errors when loading pages
- Debug panels not appearing on subpages

## 🔧 **localStorage Inspection**

Check your browser's localStorage:

```javascript
// In browser dev tools console:
JSON.parse(localStorage.getItem('vocabkiller_activity_state'))

// Should show:
{
  "activeTime": 45000,        // Milliseconds of active time
  "adWatched": false,         // Whether ad was watched
  "sessionStartTime": 1703..., // When session started
  "lastSaved": 1703...,       // Last save timestamp
  "lastPage": "/about"        // Last page visited
}
```

## 🚀 **Ready for Production**

When testing confirms everything works:

1. **Change timer to 15 minutes:**
   ```javascript
   // In both files, change:
   this.adPromptInterval = 15 * 60 * 1000; // 15 minutes
   ```

2. **Hide debug panels:**
   ```javascript
   // Comment out or remove debug panel code
   ```

3. **Monitor real user behavior** to optimize timing

---

**Your cross-page activity tracking system is now fully deployed! Test it by navigating between different pages and watching the timer continue seamlessly across your entire VocabKiller platform.** 🎉