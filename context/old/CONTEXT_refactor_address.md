# Profile Form Address Refactor Context

## 1. Component Logic: src/components/profile/ProfileForm.jsx

// Goal: Refactor the component to handle all 7 address fields separately.

// 1.1 Update useState: Add all address fields
/* Original useState (from previous context):
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        address: '', // This will be replaced/removed
        phoneNumber: '',
        addressId: null 
    });
*/
// Replacement for useState:
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        addressId: null, 
        
        // 💡 All 7 Strapi Address Fields:
        fullAddress: '',     // آدرس کامل (اصلی)
        province: '',        // استان
        city: '',            // شهر
        postalCode: '',      // کد پستی
        recipientName: '',   // نام گیرنده
        recipientPhone: '',  // تلفن گیرنده
    });

// 1.2 Update useEffect (fetchUserData): Read all 7 address fields from response data
/* Original logic to be replaced (around line 52):
    setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        address: data.address?.fullAddress || '', // This line will be replaced
        addressId: data.address?.id || null, 
        phoneNumber: data.phoneNumber || session.user.phoneNumber || '' 
    });
*/
// Replacement logic for setFormData:
    setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phoneNumber: data.phoneNumber || session.user.phoneNumber || '',
        addressId: data.address?.id || null,
        
        // 💡 Reading all 7 fields from the Address relation
        fullAddress: data.address?.fullAddress || '', 
        province: data.address?.province || '',
        city: data.address?.city || '',
        postalCode: data.address?.postalCode || '',
        recipientName: data.address?.recipientName || '',
        recipientPhone: data.address?.recipientPhone || '',
    });

// 1.3 Update handleSubmit: Use all 7 address fields in addressData object
/* Original addressData object (inside handleSubmit):
    const addressData = {
        title: 'آدرس اصلی', // Still required by Strapi
        fullAddress: formData.address, // This was the single textarea
        province: 'نامشخص', 
        city: 'نامشخص', 
        recipientName: formData.firstName + ' ' + formData.lastName,
        recipientPhone: formData.phoneNumber,
        postalCode: '0000000000',
    };
*/
// Replacement for addressData object:
    const addressData = {
        title: 'آدرس اصلی', 
        
        // 💡 Using all 7 fields from the new state
        fullAddress: formData.fullAddress,
        province: formData.province,
        city: formData.city,
        postalCode: formData.postalCode,
        recipientName: formData.recipientName,
        recipientPhone: formData.recipientPhone,
    };
    // Note: We are no longer using default fallback values like 'نامشخص' or '0000000000' 
    // because the user will provide values for all required fields via the new inputs.

// 1.4 Update JSX: Replace single textarea with all 7 inputs/textareas
// Goal: Locate the 'آدرس' textarea and replace it with the new structure.

/* Original Address block to be replaced (around line 170):
    <div className={styles.inputGroup}>
        <label htmlFor="address" className={styles.label}>
            آدرس
        </label>
        <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className={styles.textarea}
            placeholder="آدرس کامل خود را وارد کنید"
            rows="4"
            disabled={saving}
        />
    </div>
*/
// Replacement block: (Use handleChange for all new fields)
    <div className={styles.addressSection}>
        <h3 className={styles.addressTitle}>اطلاعات آدرس و گیرنده</h3>
        
        {/* Full Address (Use Textarea for detailed address) */}
        <div className={styles.inputGroup}>
            <label htmlFor="fullAddress" className={styles.label}>
                آدرس کامل
            </label>
            <textarea
                id="fullAddress"
                name="fullAddress"
                value={formData.fullAddress}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="آدرس دقیق (خیابان، کوچه، پلاک)"
                rows="3"
                disabled={saving}
            />
        </div>
        
        {/* Row 1: Province and City */}
        <div className={styles.row}>
            <div className={styles.inputGroup}>
                <label htmlFor="province" className={styles.label}>
                    استان
                </label>
                <input
                    type="text"
                    id="province"
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="استان"
                    disabled={saving}
                />
            </div>
            <div className={styles.inputGroup}>
                <label htmlFor="city" className={styles.label}>
                    شهر
                </label>
                <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="شهر"
                    disabled={saving}
                />
            </div>
        </div>
        
        {/* Row 2: Postal Code and Recipient Name */}
        <div className={styles.row}>
            <div className={styles.inputGroup}>
                <label htmlFor="postalCode" className={styles.label}>
                    کد پستی
                </label>
                <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="۱۰ رقمی"
                    dir="ltr"
                    disabled={saving}
                />
            </div>
            <div className={styles.inputGroup}>
                <label htmlFor="recipientName" className={styles.label}>
                    نام گیرنده
                </label>
                <input
                    type="text"
                    id="recipientName"
                    name="recipientName"
                    value={formData.recipientName}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="نام و نام خانوادگی گیرنده"
                    disabled={saving}
                />
            </div>
        </div>
        
        {/* Recipient Phone (If different from user's phone, otherwise remove) */}
        <div className={styles.inputGroup}>
            <label htmlFor="recipientPhone" className={styles.label}>
                تلفن گیرنده
            </label>
            <input
                type="tel"
                id="recipientPhone"
                name="recipientPhone"
                value={formData.recipientPhone}
                onChange={handleChange}
                className={styles.input}
                placeholder="شماره تماس گیرنده (در صورت تفاوت)"
                dir="ltr"
                disabled={saving}
            />
        </div>
        
    </div>