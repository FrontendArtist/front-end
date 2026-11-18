'use client';

import { useEffect, useState } from 'react';
import styles from './ProvinceCitySelects.module.scss';

export const LOCALITIES_LOADING_MESSAGE = 'فهرست استان و شهر هنوز آماده نیست. لطفاً کمی بعد دوباره تلاش کنید.';
export const LOCALITIES_LOAD_ERROR_MESSAGE = 'بارگذاری فهرست استان و شهر ناموفق بود.';
export const LOCALITY_REQUIRED_MESSAGE = 'لطفاً استان و شهر را انتخاب کنید.';

export function localitySubmitError(selection) {
    if (!selection || selection.status === 'loading') return LOCALITIES_LOADING_MESSAGE;
    if (selection.status === 'error') return LOCALITIES_LOAD_ERROR_MESSAGE;
    if (!selection.province || !selection.city) return LOCALITY_REQUIRED_MESSAGE;
    return '';
}

function cityItemName(city) {
    return typeof city === 'object' && city !== null ? city.name : String(city || '');
}

function cityItemDocId(city) {
    return typeof city === 'object' && city !== null ? (city.documentId || null) : null;
}

export function resolveOfficialPair(localities, province, city) {
    const provinceName = typeof province === 'string' ? province.trim() : '';
    const cityName = typeof city === 'string' ? city.trim() : '';
    const row = Array.isArray(localities)
        ? localities.find((item) => item?.name === provinceName)
        : undefined;

    if (!row || !Array.isArray(row.cities)) {
        return { province: '', city: '', cityLink: null };
    }
    const matched = row.cities.find((item) => cityItemName(item) === cityName);
    if (!matched) {
        return { province: row.name, city: '', cityLink: null };
    }
    return { province: row.name, city: cityName, cityLink: cityItemDocId(matched) };
}

/**
 * Province and city selects bound to official name strings.
 * An unknown saved pair is cleared so the form cannot submit it.
 */
export default function ProvinceCitySelects({
    province,
    city,
    cityLink = null,
    onChange,
    selectionRef,
    disabled = false,
    groupClassName,
    labelClassName,
    controlClassName,
    requiredMarkClassName,
    provinceId = 'province',
    cityId = 'city',
}) {
    const [localities, setLocalities] = useState([]);
    const [status, setStatus] = useState('loading');
    const [requestId, setRequestId] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setStatus('loading');

        (async () => {
            try {
                const response = await fetch('/api/localities');
                const body = await response.json().catch(() => ({}));
                if (!response.ok || !Array.isArray(body?.data)) {
                    throw new Error(body?.message || LOCALITIES_LOAD_ERROR_MESSAGE);
                }
                if (!cancelled) {
                    setLocalities(body.data);
                    setStatus('ready');
                }
            } catch {
                if (!cancelled) {
                    setLocalities([]);
                    setStatus('error');
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [requestId]);

    useEffect(() => {
        if (status !== 'ready') return;
        const next = resolveOfficialPair(localities, province, city);
        const currentProvince = typeof province === 'string' ? province : '';
        const currentCity = typeof city === 'string' ? city : '';
        if (next.province !== currentProvince || next.city !== currentCity) {
            onChange({ province: next.province, city: next.city, cityLink: null });
        }
    }, [status, localities, province, city, onChange]);

    const resolved = resolveOfficialPair(localities, province, city);
    const provinceValue = resolved.province;
    const cities = localities.find((item) => item?.name === provinceValue)?.cities ?? [];
    const cityValue = resolved.city;
    const fieldsDisabled = disabled || status !== 'ready';

    if (selectionRef) {
        selectionRef.current = {
            status,
            province: provinceValue,
            city: cityValue,
            cityLink: cityLink || null,
        };
    }

    const handleProvinceChange = (event) => {
        onChange({ province: event.target.value, city: '', cityLink: null });
    };

    const handleCityChange = (event) => {
        const nextCityName = event.target.value;
        const matched = cities.find((item) => cityItemName(item) === nextCityName);
        const nextCityLink = cityItemDocId(matched);
        onChange({ province: provinceValue, city: nextCityName, cityLink: nextCityLink });
    };

    return (
        <>
            <div className={groupClassName}>
                <label htmlFor={provinceId} className={labelClassName}>
                    استان
                    <span className={requiredMarkClassName}>*</span>
                </label>
                <div className={styles.selectWrapper}>
                    <select
                        id={provinceId}
                        name="province"
                        className={`${controlClassName || ''} ${status === 'loading' ? styles.selectLoading : ''}`.trim()}
                        value={provinceValue}
                        onChange={handleProvinceChange}
                        disabled={fieldsDisabled}
                        required
                        aria-busy={status === 'loading'}
                    >
                        <option value="">{status === 'loading' ? 'در حال بارگذاری استان‌ها...' : 'انتخاب استان'}</option>
                        {localities.map((item) => (
                            <option key={item.name} value={item.name}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                    {status === 'loading' && (
                        <span className={styles.inlineSpinner} aria-hidden="true" />
                    )}
                </div>
                {status === 'error' && (
                    <div className={styles.errorHint} role="status">
                        <span>{LOCALITIES_LOAD_ERROR_MESSAGE}</span>
                        <button
                            type="button"
                            className={styles.retryInlineBtn}
                            onClick={() => setRequestId((id) => id + 1)}
                        >
                            تلاش مجدد
                        </button>
                    </div>
                )}
            </div>

            <div className={groupClassName}>
                <label htmlFor={cityId} className={labelClassName}>
                    شهر
                    <span className={requiredMarkClassName}>*</span>
                </label>
                <select
                    id={cityId}
                    name="city"
                    className={controlClassName}
                    value={cityValue}
                    onChange={handleCityChange}
                    disabled={fieldsDisabled || !provinceValue}
                    required
                >
                    <option value="">{provinceValue ? 'انتخاب شهر' : 'ابتدا استان را انتخاب کنید'}</option>
                    {cities.map((item) => {
                        const cityName = cityItemName(item);
                        return (
                            <option key={cityName} value={cityName}>
                                {cityName}
                            </option>
                        );
                    })}
                </select>
            </div>
        </>
    );
}
