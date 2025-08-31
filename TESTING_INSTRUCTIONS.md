# 🧪 Testing Your Ad System

## 🎯 What You Should See Now

Visit your site at `https://vocabkiller.com` and you should see:

### 1. **Debug Panel (Bottom Left)**
A black panel showing:
- **Active Time**: How long you've been actively using the app
- **Until Ad**: Time remaining until ad prompt
- **Status**: 🟢 Active or 🔴 Inactive
- **Usage Limited**: Whether learning functions are restricted
- **Test Ad Button**: Manually trigger ad modal
- **Reset Timer Button**: Reset the activity timer

### 2. **Fast Testing (1 Minute Timer)**
- The ad prompt now triggers after **1 minute** of active use (instead of 15 minutes)
- This makes testing much faster
- You can change this back to 15 minutes later in `src/utils/activityTracker.js`

## 🔧 How to Test

### Test 1: Automatic Ad Prompt
1. Visit your site
2. Use the app normally (scroll, click, type)
3. Watch the debug panel - "Active Time" should increase
4. After 1 minute of active use, the ad modal should appear automatically
5. Check browser console for log: "🎯 Ad prompt triggered!"

### Test 2: Manual Ad Trigger
1. Click the **"Test Ad"** button in the debug panel
2. Ad modal should appear immediately
3. Test both "Watch Ad" and "Maybe Later" options

### Test 3: Usage Limits
1. Decline an ad (click "Maybe Later")
2. Try to access learning functions (Learn Original Text, Learn Unique Words, etc.)
3. You should see the "Usage Limit Reached" modal
4. Test both "Watch Ad & Continue" and "I'll Wait" options

### Test 4: Timer Reset
1. Let the timer run for a while
2. Click **"Reset Timer"** button
3. Active time should reset to 0
4. Check console for log: "🔄 Ad timer reset"

## 🐛 Troubleshooting

### If Debug Panel Doesn't Appear:
- Make sure you're on the latest deployed version
- Try refreshing the page
- Check browser console for any errors

### If Timer Doesn't Count:
- Make sure you're actively using the site (moving mouse, scrolling, clicking)
- The timer pauses when you're inactive for 30+ seconds
- Check the "Status" in debug panel - should show 🟢 Active

### If Ad Modal Doesn't Appear:
- Check browser console for the trigger log
- Try clicking "Test Ad" button manually
- Make sure no browser ad blockers are interfering

## 📊 Console Logs to Watch For

Open browser developer tools (F12) and look for:
- `🎯 Ad prompt triggered! Active time: 1m 0s`
- `🔄 Ad timer reset`
- Activity tracker initialization messages

## 🚀 When Ready for Production

### 1. Change Timer Back to 15 Minutes
In `src/utils/activityTracker.js`, change:
```javascript
this.adPromptInterval = 15 * 60 * 1000; // Back to 15 minutes
```

### 2. Hide Debug Panel
In `src/App.js`, change the debug panel condition:
```javascript
{process.env.NODE_ENV === 'development' && activityStats.activeTime !== undefined && (
  // Debug panel code
)}
```

### 3. Remove Console Logs
Remove or comment out the `console.log` statements in `activityTracker.js`

## 🎯 Expected Behavior

✅ **Working Correctly:**
- Debug panel appears and updates in real-time
- Timer counts up when you're active
- Timer pauses when inactive
- Ad modal appears after 1 minute
- Usage limits work when ads are declined
- Reset button works properly

❌ **Needs Investigation:**
- Debug panel doesn't appear
- Timer doesn't count or counts incorrectly
- Ad modal doesn't trigger
- Usage limits don't work
- Console errors appear

Your ad system is now ready for testing! 🎉