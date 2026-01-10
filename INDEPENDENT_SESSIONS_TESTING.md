# Independent Multi-User Session Testing Guide

## Key Changes: SessionStorage-Based Authentication

### What Changed?
- **Old**: Firebase `signOut(auth)` was global - signing out in one tab affected ALL tabs
- **New**: Each tab has its own `sessionStorage` session - completely independent login/logout

### How It Works Now:

```
User 1 (Email: user1@test.com)
  ├─ Tab 1: sessionStorage = { email: "user1@test.com", role: "CEO" }
  └─ Tab 2: sessionStorage = { email: "user1@test.com", role: "CEO" }

User 2 (Email: user2@test.com)  
  ├─ Browser Tab 3: sessionStorage = { email: "user2@test.com", role: "Member" }
  └─ Mobile Browser: sessionStorage = { email: "user2@test.com", role: "Member" }
```

Each tab/device maintains **independent sessionStorage**, so:
- **User 1 Tab 1 logs out** → Only Tab 1 clears sessionStorage
- **User 1 Tab 2 stays logged in** → Different sessionStorage
- **User 2 remains unaffected** → Completely different browser/device

---

## Testing Scenarios

### ✅ Test 1: Simultaneous Login (2-3 Different Users)

**Setup:**
1. Open **Browser Tab 1** at http://localhost:5178
2. Open **Browser Tab 2** at http://localhost:5178 (same browser)
3. Open **Browser Tab 3** at http://localhost:5178

**Test Steps:**

| Step | Tab 1 | Tab 2 | Tab 3 | Expected |
|------|-------|-------|-------|----------|
| 1 | Login: `user1@gmail.com` | Login: `user2@gmail.com` | Login: `user3@gmail.com` | All 3 users logged in simultaneously |
| 2 | See Dashboard with email | See Dashboard with email | See Dashboard with email | Each sees their own user info |
| 3 | Check sessionStorage | Check sessionStorage | Check sessionStorage | All different `current_user_session` values |

**How to Check sessionStorage:**
Press `F12` → Console tab → Run:
```javascript
console.log("Current session:", JSON.parse(sessionStorage.getItem('current_user_session')))
```

Expected Output:
- Tab 1: `{uid: "...", email: "user1@gmail.com", role: "CEO/Member"}`
- Tab 2: `{uid: "...", email: "user2@gmail.com", role: "CEO/Member"}`
- Tab 3: `{uid: "...", email: "user3@gmail.com", role: "CEO/Member"}`

---

### ✅ Test 2: Independent Logout (Most Important!)

**Setup:**
- Tabs 1, 2, 3 all logged in with different users (from Test 1)

**Test Steps:**

| Step | Action | Result |
|------|--------|--------|
| 1 | **Tab 1**: Click "Sign Out" | ✅ Tab 1 → Login screen |
| 2 | Check **Tab 2** | ✅ Tab 2 → Still shows Dashboard |
| 3 | Check **Tab 3** | ✅ Tab 3 → Still shows Dashboard |
| 4 | **Tab 2**: Click "Sign Out" | ✅ Tab 2 → Login screen |
| 5 | Check **Tab 1** | ✅ Tab 1 → Still on Login |
| 6 | Check **Tab 3** | ✅ Tab 3 → Still shows Dashboard |

**Why This Works:**
- Tab 1's `sessionStorage` is cleared → Shows login
- Tab 2's `sessionStorage` is cleared → Shows login
- Tab 3's `sessionStorage` is untouched → Still shows dashboard

---

### ✅ Test 3: Rapid Concurrent Operations

**Setup:**
- Tab 1: User1 (CEO) logged in
- Tab 2: User2 (Member) logged in
- Tab 3: User3 (Member) logged in

**Test Steps:**

1. **Tab 1 (CEO)**: Click "New Site" → Add site "BuildingX"
2. **Tab 2 (Member)**: Should see new site in real-time
3. **Tab 3 (Member)**: Should see new site in real-time
4. **Tab 2**: Click "View & Contribute" → Add expense row
5. **Tab 1**: Should see expense from Tab 2
6. **Tab 3**: Should see both site and expense
7. **While all editing**:
   - Tab 1 clicks logout
   - Tab 2 continues editing
   - Tab 3 continues editing
8. **Result**: Only Tab 1 goes to login. Tab 2 and 3 unaffected.

---

### ✅ Test 4: Mobile Device Simulation

**Alternative Setup** (if you have 2 devices):
- **Desktop Browser**: Login as User1
- **Mobile Browser**: Login as User2
- **Tablet Browser**: Login as User3

Each device has independent sessionStorage, so:
- Desktop logs out → Mobile/Tablet unaffected
- Mobile logs in/out → Desktop/Tablet unaffected

---

## Code Architecture

### SessionStorage Keys:
```javascript
// NEW - Single key per tab for current user session
sessionStorage.getItem('current_user_session')  // JSON: { uid, email, role, name }

// NO LONGER USED (removed):
// localStorage.setItem(`user_role_${uid}`, role)        ❌ REMOVED
// sessionStorage.setItem(`user_cache_${uid}`, ...)      ❌ REMOVED
```

### AuthContext Flow:

**On App Load:**
```
1. Check sessionStorage for 'current_user_session'
2. If found → Load user (this tab's session)
3. If not found → Check Firebase auth (new login)
4. Firebase auth listener saves to sessionStorage
5. Each tab is independent
```

**On Logout:**
```
1. sessionStorage.removeItem('current_user_session')
2. setUser(null)
3. Don't call signOut(auth) - keep Firebase logged in
4. Other tabs unaffected (have their own sessionStorage)
```

---

## Debugging Commands

### Check All Storage Keys:
```javascript
// In browser console
console.table(Object.entries(sessionStorage));
console.table(Object.entries(localStorage));
```

### Monitor Session Changes:
```javascript
// Add to console
setInterval(() => {
  const session = JSON.parse(sessionStorage.getItem('current_user_session') || '{}');
  console.log('Current session:', session);
}, 1000);
```

### Force Clear Storage (Troubleshooting):
```javascript
sessionStorage.clear();
location.reload();
```

---

## Expected Behavior Checklist

- [ ] User 1, 2, 3 can login in different tabs simultaneously
- [ ] Each user sees their own email/role in dashboard
- [ ] User 1 logout does NOT affect User 2 or 3
- [ ] User 2 logout does NOT affect User 1 or 3
- [ ] sessionStorage keys are unique per tab (different UIDs)
- [ ] Sites added by one user visible to all (real-time Firestore)
- [ ] Expenses edited by one user visible to all (real-time Firestore)
- [ ] Each user can upgrade to CEO independently
- [ ] Refresh page keeps user logged in (sessionStorage persists)
- [ ] Close tab → Reopen → Need to login again

---

## Common Issues & Solutions

### ❌ Issue: "Still logging out together"
**Solution**: Make sure you're using **different email addresses** for each user
- User 1: `user1@test.com`
- User 2: `user2@test.com`
- User 3: `user3@test.com`

### ❌ Issue: "Can't see other users' changes"
**Solution**: This is normal! Changes are real-time in Firestore, but check:
1. Click a site to load expenses
2. Changes should appear instantly
3. Check browser console for errors

### ❌ Issue: "sessionStorage key looks wrong"
**Solution**: It should be `'current_user_session'` (singular)
```javascript
sessionStorage.getItem('current_user_session')  // ✅ Correct
sessionStorage.getItem('user_cache_123')         // ❌ Old (removed)
```

---

## Success Criteria

✅ **Test Passed When:**
1. You can login 3 different users in 3 tabs
2. All 3 see "Project Dashboard" with their own names
3. User 1 logs out → Only User 1 goes to login screen
4. Users 2 & 3 still see dashboard
5. User 2 logs out → Only User 2 goes to login screen
6. User 3 still sees dashboard
7. User 3 logs out → Only User 3 goes to login screen

---

## Next Steps

1. **Test with 3+ different emails** ← **START HERE**
2. Verify independent logout works
3. Check sessionStorage values in console
4. Test rapid concurrent edits
5. Test on different devices/browsers if possible
