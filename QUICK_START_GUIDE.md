# 🎮 Gambling Platform - Quick Start Guide

## 🚀 Access Points

| Component | URL |
|-----------|-----|
| **Main Game Platform** | http://localhost:3000 |
| **Admin Panel** | http://localhost:3000/admin |
| **Backend API** | http://localhost:5000 |

---

## 📊 Admin Login

```
Username: Treesadhi
Password: TREESADHI2175
```

---

## 🎯 How to Test Synchronization

### Step 1: Login to Admin Panel
```
1. Go to http://localhost:3000/admin
2. Enter credentials above
3. Click "Unlock Admin Panel"
```

### Step 2: Navigate to Live Games
```
1. Click "🎮 Live Games" tab
2. You'll see all 6 games with real-time betting
```

### Step 3: Select a Winner
```
1. Find "Fast Parity" section
2. Click on "Green" button
3. It will show "✓ WINNER" badge
```

### Step 4: Verify Synchronization
```
1. Open new tab: http://localhost:3000/game/fast-parity
2. Current result should show "Green"
3. Period number appears below the result
```

---

## 🎲 Test All Games

### Game URLs:
```
Fast Parity:    http://localhost:3000/game/fast-parity
Parity:         http://localhost:3000/game/parity
Sapre:          http://localhost:3000/game/sapre
Dice:           http://localhost:3000/game/dice
Wheelocity:     http://localhost:3000/game/wheelocity
Andar Bahar:    http://localhost:3000/game/andar-bahar
```

### Admin Game Keys:
```
Fast Parity  → FastParty
Parity       → PrimePick
Sapre        → LuckyPick
Dice         → Dice
Wheelocity   → Wheelocity
Andar Bahar  → AndarBahar
```

---

## 💰 Place Bets (Testing)

### Scenario 1: Single Bet
```
1. Open game page
2. Choose "Green" button
3. Modal appears - enter ₹100
4. Click "Confirm Bet"
5. Bet appears in "Live Bet Stats"
6. Amount: ₹100
```

### Scenario 2: Multiple Bets Same Period
```
1. User 1 bets ₹50 on Green  → Total: ₹50
2. User 2 bets ₹75 on Red    → Total: ₹125 ✅
3. Total NEVER decreases     → Always: ₹125
4. Admin can see breakdown by selection
```

### Scenario 3: Period Increment
```
- Every 30 seconds: New period
- Format: 0001, 0002, 0003...
- After 0999: Goes to 1001, 1002...
- Bets reset per period
```

---

## ✅ Features Implemented

### Period System
- ✅ Format: 001-999 cycling
- ✅ Global sync across all games
- ✅ Displayed under result
- ✅ Auto-increment every period

### Bet Tracking
- ✅ Amounts only increase
- ✅ Breakdown by selection
- ✅ Live updates
- ✅ Never goes backward

### Admin Control
- ✅ Select any winner
- ✅ Instant sync to games
- ✅ Shows in results immediately
- ✅ Works across page refreshes

### All 6 Games Sync
- ✅ Fast Parity
- ✅ Parity
- ✅ Sapre
- ✅ Dice
- ✅ Wheelocity
- ✅ Andar Bahar

---

## 🧪 Verification Checklist

Run these tests to verify everything works:

### Test 1: Period Display
- [ ] Open any game
- [ ] Period shows as 3 digits (e.g., "0042")
- [ ] Period increments every 30 seconds
- [ ] Format cycles 001→999→001

### Test 2: Bet Accumulation
- [ ] Bet ₹10 on Green
- [ ] Bet ₹20 on Red
- [ ] Total shows ₹30
- [ ] Never shows less than ₹30

### Test 3: Admin Sync
- [ ] Admin selects "Green" for current period
- [ ] Game page refreshes
- [ ] Result shows "Green"
- [ ] Period number below result

### Test 4: Multiple Games
- [ ] Test admin sync on Fast Parity ✅
- [ ] Test admin sync on Parity ✅
- [ ] Test admin sync on Sapre ✅
- [ ] Test admin sync on Dice ✅
- [ ] Test admin sync on Wheelocity ✅
- [ ] Test admin sync on Andar Bahar ✅

---

## 🔍 Troubleshooting

### Issue: Admin result not showing on game page
**Solution:**
1. Hard refresh the game page (Ctrl+Shift+R)
2. Check browser console for errors (F12)
3. Verify admin selected the result (should show "✓ WINNER")

### Issue: Bet amount goes down
**Solution:**
1. This shouldn't happen with new implementation
2. Clear localStorage: `localStorage.clear()`
3. Refresh page
4. Try betting again

### Issue: Period not showing
**Solution:**
1. Check that period displays in the game header
2. Periods cycle every 30-60 seconds
3. If stuck, page may have cached data - refresh

### Issue: Admin panel not updating live games
**Solution:**
1. Verify login successful (should see "Signed in as Treesadhi")
2. Check that you're clicking on the actual selection button
3. The "✓ WINNER" badge should appear
4. Game pages may need refresh to see update

---

## 📝 Data Storage

All data is stored in browser localStorage:
```javascript
// View all stored data
console.log(localStorage);

// Clear all data (reset platform)
localStorage.clear();

// Check specific game results
console.log(JSON.parse(localStorage.getItem('game_result_overrides')));

// Check live bets
console.log(JSON.parse(localStorage.getItem('live_bets')));
```

---

## 🚀 Next Steps

1. **Test each game individually**
   - Verify period display
   - Test admin sync
   - Check bet tracking

2. **Test admin control flow**
   - Login to admin panel
   - Select winners
   - Verify game pages update

3. **Test multiple concurrent sessions**
   - Open game in 2 tabs
   - Admin panel in 3rd tab
   - Make selections, verify sync

4. **Report any issues or suggestions**
   - Check browser console for errors
   - Verify all 6 games work
   - Test edge cases (rapid bets, page refresh during betting)

---

## 📞 Support

For issues or questions:
1. Check SYNCHRONIZATION_FIXES.md for technical details
2. Review browser console (F12) for error messages
3. Clear localStorage and retry if data seems corrupted
4. Verify all 3 processes are running:
   - Backend: npm start (port 5000)
   - Frontend: npm run dev (port 3000)
   - Browser: localhost:3000

---

**Last Updated:** July 7, 2026
**Status:** ✅ All Systems Operational
