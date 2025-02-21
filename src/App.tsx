import React, { useState, useRef } from 'react';
import { Upload, Printer, FileText, X, Eye, CreditCard, DollarSign, Check, AlertCircle } from 'lucide-react';

interface FilePreview {
  name: string;
  url: string;
  type: string;
  size: number;
  pageCount: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  pageCount: number;
  isProcessing: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onConfirm, amount, pageCount, isProcessing }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-green-600" />
          Payment Required
        </h2>
        <div className="mb-6">
          <div className="text-gray-600 mb-4">
            <div className="flex justify-between mb-2">
              <span>Number of pages:</span>
              <span className="font-medium">{pageCount}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Cost per page:</span>
              <span className="font-medium">₹4.00</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total amount:</span>
              <span>₹{amount.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Printer className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Print Service</div>
                <div className="text-sm text-gray-500">Standard quality printing</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pay ₹{amount.toFixed(2)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [selectedFile, setSelectedFile] = useState<FilePreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const [isCountingPages, setIsCountingPages] = useState(false);

  const calculatePages = async (file: File): Promise<number> => {
    return new Promise((resolve) => {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = function(e) {
          const pdfData = new Uint8Array(e.target?.result as ArrayBuffer);
          // Simple estimation: Count occurrences of "/Page" in PDF
          const pageCount = (pdfData.join(',').match(/\/Page/g) || []).length;
          resolve(Math.max(1, Math.ceil(pageCount / 2))); // Ensure at least 1 page
        };
        reader.readAsArrayBuffer(file);
      } else if (file.type.startsWith('image/')) {
        resolve(); // Images count as 1 page
      } else {
        // For other document types, estimate based on file size
        const averagePageSize = 250 * 1024; // 250KB per page
        resolve(Math.max(1, Math.ceil(file.size / averagePageSize)));
      }
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload PDF, Image, or Word documents.');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    setIsCountingPages(true);
    const pageCount = await calculatePages(file);

    if (pageCount > 50) {
      setError('Document exceeds 50 page limit.');
      setIsCountingPages(false);
      return;
    }

    setError('');
    const fileUrl = URL.createObjectURL(file);
    setSelectedFile({
      name: file.name,
      url: fileUrl,
      type: file.type,
      size: file.size,
      pageCount
    });
    setIsCountingPages(false);
  };

  const handlePrintRequest = () => {
    if (!selectedFile) return;
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = () => {
    setIsProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setShowPaymentModal(false);
      setPaymentSuccess(true);
      
      // After successful payment, trigger print
      const printWindow = window.open(selectedFile.url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      // Reset payment success message after 5 seconds
      setTimeout(() => setPaymentSuccess(false), 5000);
    }, 2000);
  };

  const clearSelection = () => {
    if (selectedFile) {
      URL.revokeObjectURL(selectedFile.url);
    }
    setSelectedFile(null);
    setIsPreviewing(false);
    setPaymentSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateCost = (pageCount: number) => {
    return pageCount * 4; // ₹4 per page
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 p-6 text-white">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Printer className="w-8 h-8" />
              Print Station
            </h1>
            <p className="mt-2 text-blue-100">
              Upload your documents and print them instantly
            </p>
          </div>

          {/* Main Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {paymentSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 flex items-center gap-2">
                <Check className="w-5 h-5" />
                Payment successful! Opening print dialog...
              </div>
            )}

            {isCountingPages && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                Analyzing document...
              </div>
            )}

            {!selectedFile ? (
              /* Upload Section */
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 mx-auto text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Upload your file</h3>
                <p className="mt-2 text-sm text-gray-500">
                  PDF, Word documents, and images up to 10MB (max 50 pages)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif"
                  onChange={handleFileSelect}
                />
              </div>
            ) : (
              /* File Preview Section */
              <div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div>
                      <h3 className="font-medium text-gray-900">{selectedFile.name}</h3>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(selectedFile.size)} • {selectedFile.pageCount} {selectedFile.pageCount === 1 ? 'page' : 'pages'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={clearSelection}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {isPreviewing && (
                  <div className="mb-4 border rounded-lg overflow-hidden">
                    <iframe
                      src={selectedFile.url}
                      className="w-full h-[600px]"
                      title="File preview"
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const previewWindow = window.open(selectedFile.url, '_blank');
                      if (previewWindow) {
                        previewWindow.onload = () => {
                          setIsPreviewing(true);
                        };
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="w-5 h-5" />
                    Preview
                  </button>
                  <button
                    onClick={handlePrintRequest}
                    disabled={isProcessing}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
                      isProcessing ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    Print and Pay (₹{calculateCost(selectedFile.pageCount)})
                  </button>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">How to print your documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Upload className="w-5 h-5" />
                    <span className="font-medium">1. Upload</span>
                  </div>
                  <p className="text-sm text-gray-600">Select your file from your device</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Eye className="w-5 h-5" />
                    <span className="font-medium">2. Preview</span>
                  </div>
                  <p className="text-sm text-gray-600">Review your document before printing</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Printer className="w-5 h-5" />
                    <span className="font-medium">3. Print</span>
                  </div>
                  <p className="text-sm text-gray-600">Pay ₹4 per page and collect your printouts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handlePaymentConfirm}
        amount={selectedFile ? calculateCost(selectedFile.pageCount) : 0}
        pageCount={selectedFile?.pageCount || 0}
        isProcessing={isProcessing}
      />
    </div>
  );
}

export default App;