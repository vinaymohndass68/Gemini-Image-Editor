
import React, { useState, useCallback, useRef } from 'react';
import { editImageWithGemini } from './services/geminiService';
import { dataUrlToFile } from './utils/fileUtils';
import { UploadIcon, SparklesIcon, DownloadIcon, ShareIcon, XCircleIcon, ArrowPathIcon } from './components/Icons';

interface ImageFile {
  dataUrl: string;
  mimeType: string;
  name: string;
}

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<ImageFile | null>(null);
  const [editedImage, setEditedImage] = useState<ImageFile | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage({
          dataUrl: reader.result as string,
          mimeType: file.type,
          name: file.name,
        });
        setEditedImage(null);
        setError(null);
      };
      reader.onerror = () => {
        setError('Failed to read the image file.');
      };
      reader.readAsDataURL(file);
    } else {
      setError('Please select a valid image file.');
    }
  };

  const handleEdit = useCallback(async () => {
    if (!originalImage || !prompt.trim()) {
      setError('Please upload an image and enter an editing prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const base64Data = originalImage.dataUrl.split(',')[1];
      const result = await editImageWithGemini(base64Data, originalImage.mimeType, prompt);
      
      if (result) {
        const newMimeType = result.mimeType || 'image/png';
        const newFileName = `edited-${originalImage.name.split('.').slice(0, -1).join('.')}.png`;
        setEditedImage({
            dataUrl: `data:${newMimeType};base64,${result.base64Data}`,
            mimeType: newMimeType,
            name: newFileName,
        });
      } else {
        throw new Error('The model did not return an image. Please try a different prompt.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while editing the image.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, prompt]);

  const handleDownload = () => {
    if (!editedImage) return;
    const link = document.createElement('a');
    link.href = editedImage.dataUrl;
    link.download = editedImage.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleShare = async () => {
    if (!editedImage || !navigator.share) {
      setError('Sharing is not supported on this browser.');
      return;
    }
    try {
      const file = await dataUrlToFile(editedImage.dataUrl, editedImage.name, editedImage.mimeType);
      await navigator.share({
        files: [file],
        title: 'Edited Image',
        text: 'Check out this image I edited!',
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError('Failed to share the image.');
        console.error('Share error:', err);
      }
    }
  };

  const clearState = () => {
    setOriginalImage(null);
    setEditedImage(null);
    setPrompt('');
    setError(null);
    setIsLoading(false);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const displayImage = editedImage || originalImage;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-6xl text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
          Gemini Image Editor
        </h1>
        <p className="mt-2 text-slate-400">Upload an image, describe your edits, and let AI do the magic.</p>
      </header>
      
      <main className="w-full max-w-6xl flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Display Panel */}
        <div className="bg-slate-800/50 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[300px] lg:min-h-[600px] relative overflow-hidden border border-slate-700">
          {isLoading && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
              <ArrowPathIcon className="w-12 h-12 animate-spin text-purple-400" />
              <p className="mt-4 text-lg font-semibold">Editing in progress...</p>
            </div>
          )}
          {displayImage ? (
            <img 
              src={displayImage.dataUrl} 
              alt={editedImage ? 'Edited result' : 'Original upload'}
              className="max-w-full max-h-full object-contain rounded-lg transition-opacity duration-300" 
            />
          ) : (
            <div className="text-center text-slate-500 flex flex-col items-center">
              <UploadIcon className="w-16 h-16 mb-4" />
              <h3 className="text-xl font-semibold text-slate-300">Image Preview</h3>
              <p>Your uploaded image will appear here.</p>
            </div>
          )}
        </div>

        {/* Controls Panel */}
        <div className="bg-slate-800/50 rounded-2xl p-6 flex flex-col space-y-6 border border-slate-700">
          <div>
            <h2 className="text-2xl font-semibold mb-3 text-purple-300">1. Upload Image</h2>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange} 
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
             <button
              onClick={triggerFileInput}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              <UploadIcon className="w-5 h-5 mr-2" />
              {originalImage ? 'Change Image' : 'Select an Image'}
            </button>
            {originalImage && (
                <p className="text-sm text-slate-400 mt-2 truncate">File: {originalImage.name}</p>
            )}
          </div>
          
          <div>
            <h2 className="text-2xl font-semibold mb-3 text-cyan-300">2. Describe Your Edit</h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Add a birthday hat on the cat' or 'Change the background to a snowy mountain'"
              className="w-full h-32 p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
              disabled={!originalImage || isLoading}
            />
          </div>
          
          <button 
            onClick={handleEdit}
            disabled={!originalImage || !prompt.trim() || isLoading}
            className="w-full flex items-center justify-center gap-2 text-lg font-bold py-3 px-4 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
                       bg-gradient-to-r from-purple-500 to-cyan-500 text-white
                       hover:from-purple-600 hover:to-cyan-600
                       disabled:from-slate-600 disabled:to-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transform hover:scale-105"
          >
            <SparklesIcon className="w-6 h-6" />
            Edit Image
          </button>
          
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {editedImage && !isLoading && (
            <div className="border-t border-slate-700 pt-6 space-y-4">
              <h2 className="text-2xl font-semibold text-green-300">3. Save Your Creation</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleDownload}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  <DownloadIcon className="w-5 h-5 mr-2" />
                  Download
                </button>
                {navigator.share && (
                  <button
                    onClick={handleShare}
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                  >
                    <ShareIcon className="w-5 h-5 mr-2" />
                    Share
                  </button>
                )}
              </div>
            </div>
          )}

          {(originalImage || editedImage) && (
             <div className="border-t border-slate-700 pt-6">
                <button
                    onClick={clearState}
                    className="w-full bg-red-800/80 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                    <XCircleIcon className="w-5 h-5 mr-2" />
                    Start Over
                </button>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
