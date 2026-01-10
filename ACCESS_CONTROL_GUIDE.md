# Access Control & Permissions Guide

## Role-Based Access Matrix

### 🔐 **CEO Permissions** (Site Creator Only)
| Action | Permission | Details |
|--------|-----------|---------|
| **View Sites** | ✅ Full Access | Can view all sites |
| **Create Sites** | ✅ Yes | Can create new projects |
| **Edit Site Info** | ✅ Yes | Can edit name, location |
| **Edit Budget** | ✅ Yes | Can set project budget & value |
| **View Expenses** | ✅ Yes | Can view all expenses |
| **Add Expenses** | ✅ Yes | Can add new expenses |
| **Edit Expenses** | ✅ Own & Others | Can edit any expense |
| **Delete Expenses** | ✅ Yes | Can delete expenses |
| **Delete Site** | ✅ Yes | Can delete site entirely |

### 👥 **Member Permissions** (Regular Users)
| Action | Permission | Details |
|--------|-----------|---------|
| **View Sites** | ✅ Full Access | Can view all CEO-created sites |
| **Create Sites** | ❌ No | Cannot create projects |
| **Edit Site Info** | ❌ No | Cannot change name, location |
| **Edit Budget** | ❌ No | Can only VIEW budget/project value |
| **View Expenses** | ✅ Yes | Can view all expenses |
| **Add Expenses** | ✅ Yes | Can add their own expenses |
| **Edit Expenses** | ✅ Own Only | Can ONLY edit their own expenses |
| **Edit CEO Expenses** | ❌ No | Cannot edit CEO-created expenses |
| **Delete Expenses** | ❌ No | Cannot delete (only CEO can) |
| **Delete Site** | ❌ No | Cannot delete sites |

---

## 🎯 How It Works

### **Frontend (UI) Restrictions**

#### Dashboard
- ✅ Members can click on sites to view and contribute
- ✅ Shows "✏️ Edit & Manage →" for CEO
- ✅ Shows "📊 View & Contribute →" for Members

#### Site Financials Page
- **Budget Fields** (CEO-Protected):
  - CEO: Input fields (editable)
  - Members: Text display (read-only)

- **Expenses Table**:
  - CEO: All rows editable
  - Members: Own rows editable, CEO rows greyed out & disabled

### **Backend (Firestore) Rules**

Firestore rules enforce these restrictions at the database level:

```javascript
// CEO-controlled fields that Members CANNOT modify
['name', 'location', 'ceoBudget', 'ceoProjectValue', 'createdBy', 'createdByEmail']

// Members CAN modify other fields (expenses, daily costs, notes)
```

---

## 🔄 Data Flow Example

### Scenario 1: CEO Creates Project
```
CEO opens Dashboard
→ Clicks "Create New Project"
→ Creates "Project Alpha" with $100,000 budget
→ Firestore: {name: "Project Alpha", ceoBudget: "100000", createdBy: "CEO_uid"}
```

### Scenario 2: Member Views & Contributes
```
Member opens Dashboard
→ Sees "Project Alpha" with budget display
→ Clicks to open site
→ Sees "Project Alpha: $100,000" (read-only)
→ Adds expense "Materials: $5,000"
→ Can later edit "Materials" row (only their row)
→ Cannot edit CEO's fields or budget
```

### Scenario 3: Member Tries to Edit CEO Expense
```
Member opens expense created by CEO
→ Row appears greyed out with cursor: not-allowed
→ Input field is disabled
→ Cannot modify the value
→ Firestore rule blocks the write if attempted
```

---

## ⚙️ Configuration

### Environment Setup
```bash
# .env file
VITE_ADMIN_SIGNUP_CODE=CEO123
```

### Firestore Rules (Required)
Apply these rules in Firebase Console:
📄 See: `FIRESTORE_SECURITY_RULES.txt`

---

## 🧪 Testing Checklist

### With CEO Account
- [ ] Create a new site
- [ ] Edit site budget
- [ ] Add expense
- [ ] Edit any expense row
- [ ] Delete expense
- [ ] Delete site

### With Member Account
- [ ] View all sites (✅)
- [ ] Open a site (✅)
- [ ] View budget display (✅)
- [ ] Try to edit budget field (❌ should be disabled)
- [ ] Add new expense (✅)
- [ ] Edit own expense (✅)
- [ ] Try to edit CEO expense (❌ should be greyed out)
- [ ] Try to delete anything (❌ should not see delete button)

---

## 📋 Implementation Details

### Key Files Modified
1. **Dashboard.jsx** - Shows appropriate action labels per role
2. **SiteCosts.jsx** - Conditional input fields based on role
3. **AuthContext.jsx** - Role-based access control
4. **Firestore Rules** - Backend enforcement

### Smart Features
✅ Cross-browser sync (multiple users editing same site)
✅ Optimistic UI updates (changes visible immediately)
✅ Fallback permissions (backend rules enforce even if UI bypassed)
✅ Real-time role updates via localStorage sync
✅ Debounced saves (800ms) to prevent excessive writes

---

## 🛡️ Security Notes

- **Frontend restrictions** = Better UX
- **Backend rules** = Actual security
- Both layers work together for best experience
- Members cannot bypass restrictions even if they modify the frontend code
- All sensitive operations validated by Firebase

