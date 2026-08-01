


import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import { toast } from 'sonner';

export function ReviewModal({ isOpen, onClose, vendorName, initialReview, onSubmit, isEditing = false }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialReview && isEditing) {
      setRating(initialReview.rating);
      setComment(initialReview.comment || '');
    } else {
      setRating(0);
      setComment('');
    }
  }, [initialReview, isEditing, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit({ rating, comment });
      }
      toast.success(isEditing ? 'Review updated successfully!' : 'Review submitted successfully!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen &&
      <>
          <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          
            <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-dark-bg/50">
                <h3 className="text-lg font-bold text-white">{isEditing ? 'Edit Review' : 'Write a Review'}</h3>
                <button onClick={onClose} className="text-text-light hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="text-center">
                  <p className="text-sm text-text-light mb-2">How was your experience with</p>
                  <p className="font-semibold text-white mb-4">{vendorName}?</p>
                  
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) =>
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 transition-transform hover:scale-110">
                    
                        <Star
                      className={`w-8 h-8 ${
                      star <= (hoveredRating || rating) ?
                      'text-yellow-accent fill-yellow-accent' :
                      'text-white/20'} transition-colors`
                      } />
                    
                      </button>
                  )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">Share your thoughts (optional)</label>
                  <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full glass-input min-h-[100px] py-3 text-sm"
                  placeholder="Tell others about your experience...">
                </textarea>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1">
                    {loading ? 'Submitting...' : isEditing ? 'Update Review' : 'Submit Review'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      }
    </AnimatePresence>);

}