import React, { useEffect, useMemo, useState } from 'react';
import { Star, MessageSquare, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { reviewApi } from '../../api';
import { useAuth } from '../../context/AuthContext';

function formatRelativeDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? 's' : ''} ago`;
  return d.toLocaleDateString();
}

export function VendorReviews() {
  const { currentUser, vendorProfile } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!currentUser?.id) return;
    setLoading(true);
    reviewApi
      .vendor(currentUser.id)
      .then(({ data }) => setReviews(data))
      .catch(() => toast.error('Could not load reviews'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [currentUser?.id]);

  const stats = useMemo(() => {
    if (!reviews.length) {
      return {
        average: vendorProfile?.rating || 0,
        count: vendorProfile?.reviewCount || 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    reviews.forEach((r) => {
      sum += r.rating;
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    });
    return {
      average: Math.round((sum / reviews.length) * 10) / 10,
      count: reviews.length,
      distribution,
    };
  }, [reviews, vendorProfile]);

  const startReply = (review) => {
    setReplyingId(review.id);
    setReplyText(review.vendorReply || '');
  };

  const cancelReply = () => {
    setReplyingId(null);
    setReplyText('');
  };

  const submitReply = async (reviewId) => {
    if (!replyText.trim()) {
      toast.error('Please write a reply');
      return;
    }
    setSubmitting(true);
    try {
      await reviewApi.reply(reviewId, replyText.trim());
      toast.success('Reply sent to customer');
      cancelReply();
      load();
      window.dispatchEvent(new Event('notifications-refresh'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const fullStars = Math.floor(stats.average);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="text-center md:text-left">
          <h2 className="text-5xl font-bold text-white mb-2">{stats.average.toFixed(1)}</h2>
          <div className="flex justify-center md:justify-start mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${star <= fullStars ? 'text-yellow-accent fill-yellow-accent' : 'text-white/20'}`}
              />
            ))}
          </div>
          <p className="text-sm text-text-light">Based on {stats.count} review{stats.count !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex-1 w-full space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const pct = stats.count ? Math.round((stats.distribution[rating] / stats.count) * 100) : 0;
            return (
              <div key={rating} className="flex items-center gap-3">
                <span className="text-sm text-text-light w-4">{rating}</span>
                <Star className="w-4 h-4 text-yellow-accent fill-yellow-accent" />
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Customer Reviews</h3>
        </div>

        {loading ? (
          <p className="p-8 text-center text-text-light">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="p-8 text-center text-text-light">No reviews yet.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {reviews.map((review) => (
              <div key={review.id} className="p-6 hover:bg-white/5 transition-colors">
                <div className="flex justify-between items-start mb-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-blue/20 rounded-full flex items-center justify-center text-sky-blue font-bold shrink-0">
                      {review.user?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h4 className="font-medium text-white text-sm">{review.user}</h4>
                      <span className="text-xs text-text-light">{formatRelativeDate(review.date)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-accent fill-yellow-accent' : 'text-white/20'}`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-sm text-text-light pl-[52px]">{review.comment}</p>

                {review.vendorReply && replyingId !== review.id && (
                  <div className="mt-4 ml-[52px] rounded-xl border border-eco-green/20 bg-eco-green/5 p-4">
                    <p className="text-xs font-medium text-eco-green mb-1">Your reply</p>
                    <p className="text-sm text-text-light">{review.vendorReply}</p>
                    {review.repliedAt && (
                      <p className="text-xs text-text-light/70 mt-2">{formatRelativeDate(review.repliedAt)}</p>
                    )}
                  </div>
                )}

                {replyingId === review.id ? (
                  <div className="mt-4 ml-[52px] space-y-3">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write your reply to the customer..."
                      className="glass-input w-full min-h-[90px] text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => submitReply(review.id)}
                        className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" /> {submitting ? 'Sending...' : 'Send Reply'}
                      </button>
                      <button type="button" onClick={cancelReply} className="btn-secondary text-sm py-2 px-4 inline-flex items-center gap-2">
                        <X className="w-4 h-4" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 ml-[52px]">
                    <button
                      type="button"
                      onClick={() => startReply(review)}
                      className="text-xs text-eco-green hover:text-eco-light flex items-center gap-1 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      {review.vendorReply ? 'Edit reply' : 'Reply to customer'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
