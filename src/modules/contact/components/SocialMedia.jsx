import Image from 'next/image';
import Link from 'next/link';
import styles from './SocialMedia.module.scss';
import { API_BASE_URL } from '@/lib/api';
import { formatSingleImage } from '@/lib/strapiUtils';

const defaultSocialLinks = [
    {
        id: 'telegram',
        name: 'تلگرام',
        url: '#', // TODO: لینک تلگرام را اینجا وارد کنید
        icon: '/images/socials/telegram-icon-on-transparent-background-png-2.png'
    },
    {
        id: 'instagram',
        name: 'اینستاگرام',
        url: '#', // TODO: لینک اینستاگرام را اینجا وارد کنید
        icon: '/images/socials/Instagram_icon.png'
    },
    {
        id: 'eitaa',
        name: 'ایتا',
        url: '#', // TODO: لینک ایتا را اینجا وارد کنید
        icon: '/images/socials/eitaa.png'
    },
    {
        id: 'rubika',
        name: 'روبیکا',
        url: '#', // TODO: لینک روبیکا را اینجا وارد کنید
        icon: '/images/socials/Rubika_Icon.png'
    }
];

async function getSocials() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/socials?populate=*`, {
            next: { revalidate: 60 }
        });
        
        if (!res.ok) {
            return null;
        }
        
        const json = await res.json();
        
        if (!json.data || json.data.length === 0) {
            return null;
        }

        return json.data.map(item => ({
            id: item.id || item.documentId,
            name: item.name || item.title || '',
            url: item.link || item.url || '#',
            // پشتیبانی از ساختارهای مختلف Strapi برای عکس
            icon: formatSingleImage(item.icon || item.image || item.logo).url
        }));
    } catch (error) {
        console.error("Failed to fetch socials from Strapi:", error);
        return null; // fallback to default
    }
}

export default async function SocialMedia() {
    const fetchedSocials = await getSocials();
    const socialLinks = fetchedSocials || defaultSocialLinks;

    return (
        <div className={styles.socialMediaContainer}>
            <h3 className={styles.title}>ما را در شبکه‌های اجتماعی دنبال کنید</h3>
            <div className={styles.socialIcons}>
                {socialLinks.map((social) => (
                    <Link
                        key={social.id}
                        href={social.url}
                        className={styles.socialLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={social.name}
                    >
                        <Image
                            src={social.icon}
                            alt={social.name}
                            width={28}
                            height={28}
                        />
                    </Link>
                ))}
            </div>
        </div>
    );
}
