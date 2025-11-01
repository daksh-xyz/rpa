import { ChangeEvent, RefObject, useEffect, useRef, useState } from 'react';
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react';

interface AadhaarSide {
    file: File;
    preview: string;
}

interface FormData {
    name: string;
    dob: string;
    address: string;
    phone: string;
}

const STATIC_PHONE_NUMBER = '+91 98765 43210';
const BACKEND_BASE_URL = 'http://localhost:5001';
const API_EXTRACT_ENDPOINT = `${BACKEND_BASE_URL}/api/ocr/extract`;
const toAbsoluteUrl = (path: string) =>
    path.startsWith('http://') || path.startsWith('https://') ? path : `${BACKEND_BASE_URL}${path}`;

const initialFormData: FormData = {
    name: '',
    dob: '',
    address: '',
    phone: STATIC_PHONE_NUMBER,
};

export default function OCRPage() {
    const [frontImage, setFrontImage] = useState<AadhaarSide | null>(null);
    const [backImage, setBackImage] = useState<AadhaarSide | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [isProcessing, setIsProcessing] = useState(false);
    const [requestError, setRequestError] = useState<string | null>(null);
    const [outputImageUrl, setOutputImageUrl] = useState<string | null>(null);
    const frontInputRef = useRef<HTMLInputElement>(null);
    const backInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (file: File, side: 'front' | 'back') => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPG or PNG).');
            return;
        }

        const preview = URL.createObjectURL(file);
        const nextImage: AadhaarSide = { file, preview };

        if (side === 'front') {
            setFrontImage(prev => {
                if (prev?.preview) {
                    URL.revokeObjectURL(prev.preview);
                }
                return nextImage;
            });
        } else {
            setBackImage(prev => {
                if (prev?.preview) {
                    URL.revokeObjectURL(prev.preview);
                }
                return nextImage;
            });
        }
    };

    const handleFileInput = (event: ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
        const file = event.target.files?.[0];
        if (file) {
            handleFileUpload(file, side);
        }
    };

    const handleExtractText = async () => {
        if (!frontImage || !backImage) {
            alert('Please upload both front and back Aadhaar images before extracting.');
            return;
        }

        setIsProcessing(true);
        setRequestError(null);
        setOutputImageUrl(null);

        try {
            const formPayload = new FormData();
            formPayload.append('front', frontImage.file);
            formPayload.append('back', backImage.file);

            const response = await fetch(API_EXTRACT_ENDPOINT, {
                method: 'POST',
                body: formPayload,
            });

            if (!response.ok) {
                const errText = await response.text().catch(() => 'Unknown error');
                throw new Error(`OCR backend returned ${response.status}: ${errText}`);
            }

            const data = await response.json();

            const extracted = (data?.extracted ?? {}) as Partial<FormData>;
            const nextForm: FormData = {
                name: extracted.name ?? '',
                dob: extracted.dob ?? '',
                address: extracted.address ?? '',
                phone: extracted.phone && extracted.phone.trim().length > 0 ? extracted.phone : STATIC_PHONE_NUMBER,
            };
            setFormData(nextForm);

            const imageUrl = data?.output_image_url ? toAbsoluteUrl(data.output_image_url) : null;
            if (imageUrl) {
                const cacheBusted = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
                setOutputImageUrl(cacheBusted);
            }
        } catch (error) {
            console.error(error);
            setOutputImageUrl(null);
            setRequestError(
                error instanceof Error ? error.message : 'Unable to process OCR output. Please verify the backend.',
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleInputChange = (field: keyof FormData) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { value } = event.target;
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleClearAll = () => {
        if (frontImage?.preview) {
            URL.revokeObjectURL(frontImage.preview);
        }
        if (backImage?.preview) {
            URL.revokeObjectURL(backImage.preview);
        }

        setFrontImage(null);
        setBackImage(null);
        setFormData(initialFormData);
        setIsProcessing(false);
        setRequestError(null);
        setOutputImageUrl(null);

        if (frontInputRef.current) {
            frontInputRef.current.value = '';
        }
        if (backInputRef.current) {
            backInputRef.current.value = '';
        }
    };

    useEffect(() => {
        return () => {
            if (frontImage?.preview) {
                URL.revokeObjectURL(frontImage.preview);
            }
            if (backImage?.preview) {
                URL.revokeObjectURL(backImage.preview);
            }
        };
    }, [frontImage, backImage]);

    const renderUploadSlot = (
        label: string,
        description: string,
        side: 'front' | 'back',
        image: AadhaarSide | null,
        inputRef: RefObject<HTMLInputElement>,
    ) => {
        const handleSelect = () => inputRef.current?.click();

        return (
            <div className="border border-dashed border-gray-300 rounded-lg p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                        <p className="text-xs text-gray-500">{description}</p>
                        {image && (
                            <p className="mt-2 text-xs text-gray-600">
                                Selected: <span className="font-medium">{image.file.name}</span>
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleSelect}
                        className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
                    >
                        <Upload size={16} />
                        <span>{image ? 'Replace' : 'Upload'}</span>
                    </button>
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={event => handleFileInput(event, side)}
                />
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Aadhaar OCR</h1>
                        <p className="text-gray-600">
                            Upload Aadhaar front and back images, then extract the key details into a form.
                        </p>
                    </div>

                    {(frontImage || backImage) && (
                        <button
                            onClick={handleClearAll}
                            className="flex items-center space-x-2 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
                        >
                            <Trash2 size={16} />
                            <span>Clear All</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6">
                <div className="flex h-[calc(100vh-140px)] gap-6">
                    <div className="w-1/2 flex flex-col space-y-6 overflow-y-auto">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Upload Aadhaar Images</h2>
                                    <p className="text-sm text-gray-600">
                                        Upload the front side first, followed by the back side. Images stay side by side for
                                        quick review.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {renderUploadSlot(
                                    'Front Side',
                                    'Add the front image of the Aadhaar card.',
                                    'front',
                                    frontImage,
                                    frontInputRef,
                                )}
                                {renderUploadSlot(
                                    'Back Side',
                                    'Add the back image of the Aadhaar card.',
                                    'back',
                                    backImage,
                                    backInputRef,
                                )}
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleExtractText}
                                    disabled={isProcessing}
                                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isProcessing ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <FileText size={16} />
                                    )}
                                    <span>{isProcessing ? 'Extracting…' : 'Extract Details'}</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
                            <div className="flex gap-4 justify-center">
                                <div className="w-1/2 min-h-[220px] flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                                    {frontImage ? (
                                        <img
                                            src={frontImage.preview}
                                            alt="Aadhaar front preview"
                                            className="h-full w-full object-contain"
                                        />
                                    ) : (
                                        <div className="text-center text-sm text-gray-500 px-4">
                                            Front image preview will appear here.
                                        </div>
                                    )}
                                </div>
                                <div className="w-1/2 min-h-[220px] flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                                    {backImage ? (
                                        <img
                                            src={backImage.preview}
                                            alt="Aadhaar back preview"
                                            className="h-full w-full object-contain"
                                        />
                                    ) : (
                                        <div className="text-center text-sm text-gray-500 px-4">
                                            Back image preview will appear here.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {(requestError || outputImageUrl) && (
                                <div className="mt-6 border-t border-gray-200 pt-4">
                                    {requestError && (
                                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                                            {requestError}
                                        </p>
                                    )}
                                    {outputImageUrl && (
                                        <div className={requestError ? 'mt-4' : 'mt-0'}>
                                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Processed Overlay Preview</h4>
                                            <div className="border border-gray-200 rounded-md bg-gray-50 overflow-hidden">
                                                <img
                                                    src={outputImageUrl}
                                                    alt="Processed Aadhaar overlay output"
                                                    className="w-full max-h-72 object-contain"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-1/2 bg-white rounded-lg border border-gray-200 p-6 overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Extracted Details</h2>
                                <p className="text-sm text-gray-600">
                                    Click extract once both images are uploaded to auto-fill the form.
                                </p>
                            </div>
                        </div>

                        <form className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="name">
                                    Full Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={handleInputChange('name')}
                                    placeholder="Name as per Aadhaar"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="dob">
                                    Date of Birth
                                </label>
                                <input
                                    id="dob"
                                    type="text"
                                    value={formData.dob}
                                    onChange={handleInputChange('dob')}
                                    placeholder="DD/MM/YYYY"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="address">
                                    Address
                                </label>
                                <textarea
                                    id="address"
                                    rows={4}
                                    value={formData.address}
                                    onChange={handleInputChange('address')}
                                    placeholder="Residential address from Aadhaar"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="phone">
                                    Phone Number
                                </label>
                                <input
                                    id="phone"
                                    type="text"
                                    value={formData.phone}
                                    readOnly
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100 text-gray-700 cursor-not-allowed"
                                />
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
