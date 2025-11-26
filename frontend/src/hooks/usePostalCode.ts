import { useState, useEffect } from 'react';

interface PostalCodeResult {
    prefecture: string;
    city: string;
    town: string;
}

export const usePostalCode = (postalCode: string) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<PostalCodeResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Only fetch if postal code is 7 digits
        const cleaned = postalCode.replace(/[^0-9]/g, '');
        if (cleaned.length !== 7) {
            setData(null);
            return;
        }

        const fetchAddress = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`
                );
                const json = await response.json();

                if (json.status === 200 && json.results && json.results.length > 0) {
                    const result = json.results[0];
                    setData({
                        prefecture: result.address1,
                        city: result.address2,
                        town: result.address3,
                    });
                } else {
                    setError('郵便番号が見つかりませんでした');
                    setData(null);
                }
            } catch (err) {
                setError('住所の取得に失敗しました');
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchAddress, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [postalCode]);

    return { data, loading, error };
};
