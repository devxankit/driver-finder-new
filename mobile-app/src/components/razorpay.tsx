/**
 * Razorpay Standard Checkout in a full-screen WebView, shared by plan purchase
 * and the one-time registration fee. The server creates the order; this only
 * collects the payment and reports the signed result back.
 */
import React, { useRef } from 'react';
import { Alert, Linking, Modal, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock, X } from 'lucide-react-native';
import Pressable from './Pressable';
import T from './T';
import { colors } from '../theme';
import { ActivityIndicator } from 'react-native';

export type RazorpayOrder = { order: { id: string; amount: number; currency: string }; keyId: string; prefill: { contact: string; name: string } };
export type RazorpayResult = { type: 'success'; orderId: string; paymentId: string; signature: string } | { type: 'failed'; reason: string } | { type: 'dismiss' } | { type: 'error'; reason: string };

function html(o: RazorpayOrder, description: string) {
  const opts = {
    key: o.keyId,
    amount: o.order.amount,
    currency: o.order.currency,
    order_id: o.order.id,
    name: 'Driver Finder',
    description,
    prefill: o.prefill,
    theme: { color: '#FEBE02' },
    retry: { enabled: true },
  };
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:sans-serif;background:#F6F5F1;display:flex;align-items:center;justify-content:center;height:100vh;color:#4A4A47}</style></head>
<body><p>Opening secure payment…</p>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
function post(x){window.ReactNativeWebView.postMessage(JSON.stringify(x));}
try{
var o=${JSON.stringify(opts)};
o.handler=function(r){post({type:'success',orderId:r.razorpay_order_id,paymentId:r.razorpay_payment_id,signature:r.razorpay_signature});};
o.modal={ondismiss:function(){post({type:'dismiss'});},confirm_close:true};
var rzp=new Razorpay(o);
rzp.on('payment.failed',function(r){post({type:'failed',reason:(r.error&&r.error.description)||'Payment failed'});});
rzp.open();
}catch(e){post({type:'error',reason:String(e)});}
</script></body></html>`;
}

/**
 * `onResult` gets every event. A "failed" attempt keeps the sheet open so
 * Razorpay can offer another method; "success" and "dismiss" close it.
 */
export function RazorpaySheet({ order, description, onResult, onClose }: { order: RazorpayOrder | null; description: string; onResult: (r: RazorpayResult) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const closing = useRef(false);
  const onMessage = (e: WebViewMessageEvent) => {
    let msg: RazorpayResult;
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    onResult(msg);
  };
  // Never mount a hidden <Modal>: on Android (Fabric) an unopened Modal left the
  // screen's native views out of sync, so later steps drew stale content.
  if (!order) return null;
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (closing.current) return;
        onResult({ type: 'dismiss' });
        onClose();
      }}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.white }}>
          <Pressable
            onPress={() => {
              onResult({ type: 'dismiss' });
              onClose();
            }}
            hitSlop={10}
            accessibilityLabel="Close payment"
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <X size={22} color={colors.ink} />
          </Pressable>
          <T w="bold" size={15} style={{ flex: 1 }}>
            Secure payment
          </T>
          <Lock size={16} color={colors.green} />
        </View>
        {order ? (
          <WebView
            source={{ html: html(order, description), baseUrl: 'https://checkout.razorpay.com' }}
            onMessage={onMessage}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            // UPI apps open through upi:// or intent:// links; hand those to Android.
            onShouldStartLoadWithRequest={(req) => {
              if (/^https?:|^about:|^data:|^blob:/.test(req.url)) return true;
              Linking.openURL(req.url).catch(() => Alert.alert('UPI', 'No UPI app found for this payment. Try another method.'));
              return false;
            }}
            startInLoadingState
            renderLoading={() => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.ink} />
              </View>
            )}
          />
        ) : null}
      </View>
    </Modal>
  );
}
