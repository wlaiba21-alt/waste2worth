import React, { useEffect, useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { reviewApi } from '../../api';
import { ReviewModal } from '../../components/ReviewModal';
import { toast } from 'sonner';

export function UserReviews() {
  const [pendingReviews, setPendingReviews] = useState([]);
  const [pastReviews, setPastReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([reviewApi.pending(), reviewApi.my()])
      .then(([pendingRes, myRes]) => {
        setPendingReviews(pendingRes.data);
        setPastReviews(myRes.data);
      })
      .catch(() => toast.error('Failed to load reviews'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openReview = (item) => {
    setSelected(item);
    setIsModalOpen(true);
  };

  const handleSubmit = async ({ rating, comment }) => {
    if (!selected) return;
    try {
      // Prepare payload: send requestId if it's a request, orderId if it's an order
      const payload = {
        vendorId: selected.vendorId,
        rating,
        comment,
      };
      
      if (selected.type === 'request') {
        payload.requestId = selected.requestId;
      } else if (selected.type === 'order') {
        payload.orderId = selected.orderId;
        // Also add productId if available (from pending reviews)
        if (selected.productId) {
          payload.productId = selected.productId;
        }
      }
      
      await reviewApi.create(payload);
      toast.success('Review submitted successfully!');
      setIsModalOpen(false);
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    }
  };

  if (loading) return <div className="text-text-light">Loading reviews...</div>;

  return (
    <div className="space-y-8">
      {pendingReviews.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Pending Reviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingReviews.map((pr) => (
              <div key={pr.id} className="glass-card p-5 flex items-center justify-between border-soft-orange/30">
                <div>
                  <p className="text-sm text-text-light mb-1">
                    Completed on {new Date(pr.date).toLocaleDateString()} · {pr.category}
                  </p>
                  <p className="font-medium text-white">{pr.vendorName}</p>
                </div>
                <button type="button" onClick={() => openReview(pr)} className="btn-secondary py-2 px-4 text-sm">
                  Write Review
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Your Reviews</h2>
        {pastReviews.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <MessageSquare className="w-12 h-12 text-text-light/50 mx-auto mb-3" />
            <p className="text-text-light">You haven&apos;t left any reviews yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pastReviews.map((review) => (
              <div key={review.id} className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-white">{review.vendorName}</h3>
                    <span className="text-xs text-text-light">{new Date(review.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-accent fill-yellow-accent' : 'text-white/20'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-text-light">{review.comment}</p>
                {review.vendorReply && (
                  <p className="text-sm text-eco-green mt-3 border-t border-white/10 pt-3">
                    <span className="font-medium">Vendor reply:</span> {review.vendorReply}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelected(null);
        }}
        vendorName={selected?.vendorName || 'Vendor'}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
