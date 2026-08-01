import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, ScanLine, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { aiApi } from '../api';

export function AIDetectPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = async (selectedFile) => {
    if (!selectedFile?.type.startsWith('image/')) return;
    setFile(URL.createObjectURL(selectedFile));
    setIsAnalyzing(true);
    setResult(null);
    const fd = new FormData();
    fd.append('image', selectedFile);
    fd.append('hint', 'plastic');
    try {
      const { data } = await aiApi.detect(fd);
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><ScanLine className="text-eco-green" /> AI Waste Detection</h1>
        <p className="text-text-light text-sm mt-1">Upload a photo to classify waste and find matching vendors.</p>
      </motion.div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        onClick={() => fileInputRef.current?.click()}
        className={`glass-card border-2 border-dashed p-12 text-center cursor-pointer ${isDragging ? 'border-eco-green bg-eco-green/5' : 'border-white/10'}`}
      >
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <Upload className="w-12 h-12 text-text-light mx-auto mb-4" />
        <p className="text-white font-medium">Drop image or click to upload</p>
      </div>

      {file && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 grid md:grid-cols-2 gap-6">
          <img src={file} alt="Upload" className="rounded-xl max-h-64 object-cover w-full" />
          <div>
            {isAnalyzing ? (
              <p className="text-eco-green animate-pulse">Analyzing...</p>
            ) : result ? (
              <>
                <p className="text-eco-green font-bold text-lg">{result.category}</p>
                <p className="text-text-light text-sm">Confidence: {result.confidence}%</p>
                <p className="text-text-light text-sm mt-2">Est. weight: {result.estimatedWeight}</p>
                <h3 className="text-white font-semibold mt-6 mb-3">Suggested Vendors</h3>
                {result.suggestedVendors?.map((v) => (
                  <Link key={v.id} to={`/vendors/${v.id}`} className="block bg-white/5 rounded-lg p-3 mb-2 hover:bg-white/10 flex justify-between items-center">
                    <span className="text-white text-sm">{v.name}</span>
                    <ArrowRight className="w-4 h-4 text-eco-green" />
                  </Link>
                ))}
              </>
            ) : null}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
