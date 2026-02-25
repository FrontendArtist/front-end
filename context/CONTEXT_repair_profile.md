# Profile and Address Repair Context

## 1. Proxy Fix: src/app/api/profile/route.js (GET Update)
// Goal: Update the GET handler to populate the 'address' relation from Strapi.

// Original URL:
// const url = `${STRAPI_URL}/api/users/${session.user.id}`; 
// 
// New URL with populate:
const url = `${STRAPI_URL}/api/users/${session.user.id}?populate=address`; 

## 2. New Proxy: src/app/api/addresses/route.js (POST Address Creation)
// Goal: Create a new API route for POST requests to create a new address record in Strapi.

// **Action: Create this file and paste the content below**

import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL.replace('/api', '');
const STRAPI_ADMIN_TOKEN = process.env.STRAPI_API_TOKEN;

export async function POST(request) {
    const body = await request.json();

    const url = `${STRAPI_URL}/api/addresses`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRAPI_ADMIN_TOKEN}`, 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error("Strapi Address Creation Error:", response.status, await response.text());
            return NextResponse.json({ message: "Strapi Address Creation Error" }, { status: response.status });
        }
        
        const createdData = await response.json();
        return NextResponse.json(createdData);
    } catch (error) {
        console.error("Proxy POST Error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}


## 3. New Proxy: src/app/api/addresses/[id]/route.js (PUT Address Update)
// Goal: Create a new dynamic API route for PUT requests to update an existing address record.

// **Action: Create this file and paste the content below**

import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL.replace('/api', '');
const STRAPI_ADMIN_TOKEN = process.env.STRAPI_API_TOKEN;

export async function PUT(request, { params }) {
    const { id } = params; 
    const body = await request.json();

    const url = `${STRAPI_URL}/api/addresses/${id}`;
    
    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${STRAPI_ADMIN_TOKEN}`, 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body), 
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error(`Strapi Address Update Error on ID ${id}:`, response.status, await response.text());
            return NextResponse.json({ message: "Strapi Address Update Error" }, { status: response.status });
        }
        
        const updatedData = await response.json();
        return NextResponse.json(updatedData);
    } catch (error) {
        console.error("Proxy PUT Error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}


## 4. Component Logic: src/components/profile/ProfileForm.jsx

// Goal: Integrate address loading and dual-step saving (User update + Address update/create).
// Note: We need to add 'addressId' to formData state.

// 4.1 Update useState: Add addressId
/* Original:
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        address: '',
        phoneNumber: ''
    });
*/
// Replacement:
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        address: '',
        phoneNumber: '',
        addressId: null // New state to hold the Address record ID
    });

// 4.2 Update useEffect (fetchUserData): Read address and addressId from response data
/* Original lines to be replaced (around line 52):
    setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        address: data.address || '',
        phoneNumber: data.phoneNumber || session.user.phoneNumber || '' 
    });
*/
// Replacement:
    setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        address: data.address?.fullAddress || '', // Read fullAddress from the relation
        addressId: data.address?.id || null, // Read the address ID for updating
        phoneNumber: data.phoneNumber || session.user.phoneNumber || '' 
    });


// 4.3 Update handleSubmit: Implement dual fetch for User and Address

/* Original handleSubmit (around line 77):
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    // address: formData.address, // We commented this out previously
                }),
            });
            // ... rest of try/catch/finally
    }
*/
// Replacement:
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            // =======================================================
            // 1. ذخیره نام و نام خانوادگی (در مدل User)
            // =======================================================
            const userUpdateResponse = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                }),
            });
            
            if (!userUpdateResponse.ok) {
                const errorData = await userUpdateResponse.json();
                throw new Error(errorData.message || 'خطا در ذخیره نام و نام خانوادگی');
            }

            // =======================================================
            // 2. ذخیره آدرس (در مدل Address)
            // Note: We must send required fields for Address model.
            // =======================================================
            
            let addressResponse;
            const addressData = {
                // Must provide required fields for Address model (even if default values)
                title: 'آدرس اصلی',
                fullAddress: formData.address,
                province: 'نامشخص', 
                city: 'نامشخص', 
                recipientName: formData.firstName + ' ' + formData.lastName,
                recipientPhone: formData.phoneNumber,
                postalCode: '0000000000',
            };
            
            if (formData.addressId) {
                // If Address exists, PUT to update (using the new Address Proxy)
                addressResponse = await fetch(`/api/addresses/${formData.addressId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: addressData }), 
                });
            } else {
                // If Address doesn't exist, POST to create and link to the User
                addressResponse = await fetch('/api/addresses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        data: {
                            ...addressData,
                            user: session.user.id // Link the new Address record to the current User
                        }
                    }),
                });
            }
            
            if (!addressResponse.ok) {
                const errorData = await addressResponse.json();
                // Even if the name saved, we show the address saving error
                throw new Error(errorData.message || 'خطا در ذخیره آدرس'); 
            }
            
            // If creation was successful, update the local state with the new addressId
            if (!formData.addressId) {
                const newAddress = await addressResponse.json();
                setFormData(prev => ({
                    ...prev,
                    addressId: newAddress.data.id
                }));
            }


            setSuccess('اطلاعات با موفقیت ذخیره شد');

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccess('');
            }, 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };