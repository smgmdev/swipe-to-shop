import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Placeholder products until Google Sheets integration
// Google Sheet CSV URL (publish your sheet to web as CSV)
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1p2cGXEEdCoEG9hCBKEhxcQVCuiAhX9T5d87yrQ3H8BY/gviz/tq?tqx=out:csv&gid=1786404372"; // replace with published CSV

// Placeholder until loaded
const sampleProducts = [];

const USDT_WALLET = "TVbHjvymscTb8JDk7jHXqHZJGFMWnGEU3o";

export default function App() {
  const [currency, setCurrency] = useState("USD");
  const [usdToRub, setUsdToRub] = useState(1);
  const convertPrice = (p) => currency === "USD" ? p : Math.round(p * usdToRub);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function fetchRate(){
      try{
        const r = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=USDTRUB");
        const j = await r.json();
        if(j.price) setUsdToRub(Number(j.price));
      }catch(e){console.error(e);}
    }
    fetchRate();
  }, [currency]);

  useEffect(() => {
    async function loadSheet() {
      console.log("Fetching sheet:", SHEET_URL);
      try {
        const res = await fetch(SHEET_URL);
        console.log("Sheet response status:", res.status);
        const text = await res.text();
        // Improved row parsing to handle CRLF
        const cleaned = text.replace(/\r/g, "");;
        const rows = cleaned.split("\n").map(r => {
          const m = r.match(/(\".*?\"|[^\",]+)(?=,|$)/g);
          return m || [];
        });
        console.log("Parsed rows:", rows.slice(0,5));
        console.log("Headers:", rows[0]);
        console.log("First rows:", rows.slice(1,5));
        const headers = rows.shift();

        const parsed = rows.map(row => {
          const obj = {};
          headers.forEach((h, i) => {
            const normalize = (s) => s.replace(/^"(.*)"$/, "$1").trim();
            const key = normalize(h).toLowerCase();
            obj[key] = row[i] ? normalize(row[i]) : "";
          });

          return {
            id: obj.id,
            title: obj.title,
            category: obj.category,
            price: Number(obj.price || 0),
            image: obj.image,
            description: obj.description,
            material: obj.material,
            size: obj.size,
            images: obj.images ? obj.images.split("|").map(s => s.trim()) : [obj.image],
          };
        });

        setProducts(parsed.filter(p => p.title))
      } catch (e) {
        console.error("Sheet load error", e);
      } finally {
        setLoading(false);
      }
    }
    loadSheet();
  }, []);
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(null);
  const [popupProduct, setPopupProduct] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const [checkoutStep, setCheckoutStep] = useState(0); // 0: product, 1: details, 2: payment, 3: review
  const [selectedSize, setSelectedSize] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("USDT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const product = products[index] || {};
  const [zoomImage, setZoomImage] = useState(null);

  const handleSwipe = (direction) => {
    if (direction === "left") {
      // Next product
      if (index < products.length - 1) {
        setPrevIndex(index);
        setIndex(index + 1);
      } else {
        setPrevIndex(index);
        setIndex(products.length > 0 ? 0 : 0);
      }
    } else {
      // Right = Buy -> open popup
      setPopupProduct(product);
      setCarouselIndex(0);
      setCheckoutStep(0);
      setPaymentMethod("USDT");
    }
  };

  const handleDragEnd = (_, info) => {
    const swipeThreshold = 120;
    if (info.offset.x > swipeThreshold || info.velocity.x > 500) {
      handleSwipe("right");
    } else if (info.offset.x < -swipeThreshold || info.velocity.x < -500) {
      handleSwipe("left");
    }
  };

  const handleBack = () => {
    if (prevIndex === null) return;
    setIndex(prevIndex);
    setPrevIndex(null);
  };

  const handleImageDragEnd = (_, info) => {
    if (!popupProduct) return;
    const images = popupProduct.images || [popupProduct.image];
    const threshold = 60;

    if (info.offset.x < -threshold) {
      setCarouselIndex((prev) => (prev + 1) % images.length);
    } else if (info.offset.x > threshold) {
      setCarouselIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const handleCopyWallet = async () => {
    try {
      await navigator.clipboard.writeText(USDT_WALLET);
      alert("Wallet address copied");
    } catch (e) {
      console.error(e);
    }
  };

  // Tinkoff card payment init
async function handleTinkoffPay(product) {
  try {
    const response = await fetch("https://tinkoff-demo.rucloud.host/tinkoff-init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(product.price ?? 0),
        description: product.title,
        orderId: "order-" + Date.now(),
        successUrl: window.location.origin + "/success",
        failUrl: window.location.origin + "/fail",
      })
    });

    const data = await response.json();

    if (data.url) {
      window.location.href = data.url;
      return true;
    } else {
      alert("Tinkoff error: " + JSON.stringify(data));
      return false;
    }
  } catch (err) {
    alert("Network error: " + err.message);
    return false;
  }
}

  const handlePlaceOrder = () => {
    if (!popupProduct) return;

    console.log("ORDER", {
      product: popupProduct,
      name,
      email,
      phone,
      address,
      paymentMethod,
    });

    alert(`Order placed for ${popupProduct.title}. We will contact you within 6–12 hours.`);
    setPopupProduct(null);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col items-center pt-10 px-5 font-sans text-[#111827]">
      <header className="w-full max-w-md mb-6 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[0.7rem] uppercase tracking-[0.3em] text-black/40">MULLANABRAND.COM</span>
          <h1 className="text-[1.4rem] font-semibold tracking-tight">Fashion Swipe</h1>
        </div>
        <div className="flex items-center gap-2">
  <select
    className="border border-black/20 rounded-lg px-2 py-1 text-[0.75rem] bg-white"
    value={currency}
    onChange={(e) => setCurrency(e.target.value)}
  >
    <option value="USD">USD</option>
    <option value="RUB">RUB</option>
  </select>
  <img src="https://corporate.stankeviciusgroup.com/assets/swipe/mbb.png" alt="Logo" className="w-10 h-10 rounded-full object-cover" />
</div>
      </header>

      {/* Product Tinkoff */}
      <div className="relative w-full max-w-md h-[430px] flex items-center justify-center mb-8">
        <AnimatePresence mode="wait">
          <AnimatePresence mode="wait"><motion.div key={index} initial={{opacity:0, x:50}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-50}} transition={{duration:0.25, ease:"easeOut"}} className="relative w-full h-full rounded-[1.8rem] overflow-hidden shadow-xl">
            <button
              type="button"
              onClick={() => setCarouselIndex((prev) => (prev - 1 + (product.images?.length || 1)) % (product.images?.length || 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white/70 hover:bg-white backdrop-blur-md shadow-md w-7 h-7 rounded-full flex items-center justify-center text-black/70"
            >‹</button>

            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                const threshold = 60;
                if (info.offset.x < -threshold) setCarouselIndex((prev) => (prev + 1) % (product.images?.length || 1));
                else if (info.offset.x > threshold) setCarouselIndex((prev) => (prev - 1 + (product.images?.length || 1)) % (product.images?.length || 1));
              }}
              className="w-full h-full"
            >

              {/* PRODUCT DETAILS OVERLAY */}
              <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/60 via-black/30 to-transparent text-white z-30">
                <p className="text-[0.65rem] uppercase tracking-[0.25em] opacity-90">{product.category}</p>
                <h3 className="text-lg font-medium leading-tight">{product.title}</h3>
                <p className="text-sm mt-1 opacity-90">{currency === "USD" ? "$" + convertPrice(product.price) : convertPrice(product.price) + " ₽"}</p>
              </div>

              <img
                onClick={() => setZoomImage(product.images?.[carouselIndex] || product.image)}
                src={product.images?.[carouselIndex] || product.image}
                alt={product.title}
                className="w-full h-full object-cover"
              />

              <button
                type="button"
                onClick={() => setCarouselIndex((prev) => (prev + 1) % (product.images?.length || 1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white/70 hover:bg-white backdrop-blur-md shadow-md w-7 h-7 rounded-full flex items-center justify-center text-black/70"
              >›</button>

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {(product.images || [product.image]).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-3 rounded-full ${i === carouselIndex ? "bg-white" : "bg-white/40"}`}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div></AnimatePresence>{zoomImage && (
            <div
              className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[999] overflow-y-auto"
              onClick={() => setZoomImage(null)}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCarouselIndex((prev) =>
                    (prev - 1 + (product.images?.length || 1)) %
                    (product.images?.length || 1)
                  );
                }}
                className="absolute left-5 top-1/2 -translate-y-1/2 bg-white/40 text-white w-10 h-10 rounded-full flex items-center justify-center"
              >
                ‹
              </button>

              <img
                src={product.images?.[carouselIndex] || product.image}
                className="max-w-[95%] max-h-[95%] object-contain my-10"
              />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCarouselIndex((prev) =>
                    (prev + 1) % (product.images?.length || 1)
                  );
                }}
                className="absolute right-5 top-1/2 -translate-y-1/2 bg-white/40 text-white w-10 h-10 rounded-full flex items-center justify-center"
              >
                ›
              </button>
            </div>
          )}
          
        </AnimatePresence>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-center gap-4 w-full max-w-md mb-6">
        <button
          type="button"
          disabled={prevIndex === null}
          onClick={handleBack}
          className={`px-6 py-3 rounded-full border text-sm tracking-[0.16em] uppercase transition-all ${
            prevIndex === null
              ? "border-gray-200 text-gray-300 bg-white/60"
              : "border-black/20 text-black bg-white hover:border-black hover:bg-black hover:text-white"
          }`}
        >
          Back
        </button>

        <button
          type="button"
          onClick={() => handleSwipe("right")}
          className="px-10 py-3 rounded-full bg-black text-white text-sm tracking-[0.2em] uppercase shadow-lg shadow-black/20 hover:bg-black/90"
        >
          Buy
        </button>

        <button
          type="button"
          onClick={() => handleSwipe("left")}
          className="px-6 py-3 rounded-full border border-black/20 text-sm tracking-[0.16em] uppercase bg-white hover:border-black"
        >
          Next
        </button>
      </div>

      <p className="text-[0.7rem] text-black/40 tracking-[0.18em] uppercase">
        © 2025 Mullana Brand
      </p>

      {/* POPUP — Apple Style bottom sheet */}
      <AnimatePresence>
        {popupProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/35 backdrop-blur-sm flex items-end md:items-center justify-center z-40"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-lg bg-[#f6f6f6] rounded-t-[2rem] md:rounded-[2rem] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.45)] border border-black/10 flex flex-col max-h-[90vh]"
            >
              {/* Handle bar */}
              <div className="w-10 h-1.5 rounded-full bg-black/15 mx-auto mb-3" />

              

              {/* Image carousel */}
              {/* Image slider removed per request */}

              {/* Product info */}
              {checkoutStep === 0 && (
                <>
                  <div className="space-y-1 mb-4">
                    <p className="text-[0.7rem] uppercase tracking-[0.24em] text-black/45">{popupProduct.category}</p>
                    <h3 className="text-xl font-medium tracking-tight">{popupProduct.title}</h3>
                    <p className="text-black/70 text-sm">{currency === "USD" ? "$" + convertPrice(popupProduct.price) : convertPrice(popupProduct.price) + " ₽"}</p>
                  </div>

                  <div className="text-sm text-black/70 space-y-2 mb-4">
  <p>{popupProduct.description}</p>
  <p><span className="font-semibold">Material:</span> {popupProduct.material}</p>
  {/* SIZE SELECTOR */}
  <p className="font-semibold">Select size:</p>
  <div className="flex gap-2 flex-wrap">
    {(popupProduct.size || "").split(/[,|]/).map(s => s.trim()).filter(Boolean).map((s, i) => (
      <button
        key={i}
        type="button"
        onClick={() => setSelectedSize(s)}
        className={`px-3 py-1 rounded-full border text-sm ${selectedSize === s ? "bg-black text-white border-black" : "bg-white text-black border-black/20"}`}
      >
        {s}
      </button>
    ))}
  </div>
</div>
                </>
              )}

              {/* Checkout steps */}
              <div className="border-t border-black/10 pt-4 mt-1 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  {[0, 1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={`flex-1 h-1.5 rounded-full ${
                        checkoutStep >= step ? "bg-black" : "bg-black/15"
                      }`}
                    />
                  ))}
                </div>

                <div className="space-y-4 text-sm text-black/75 overflow-y-auto pr-1 mb-4">
                  {checkoutStep === 0 && (
                    <p className="text-[0.8rem] text-black/60">
                      Review the product and swipe images above. When you are ready, continue to
                      checkout.
                    </p>
                  )}

                  {checkoutStep === 1 && (
                    <div className="space-y-3">
                      <p className="text-[0.75rem] uppercase tracking-[0.2em] text-black/50">
                        Your details
                      </p>
                      <div className="space-y-1">
                        <label className="text-[0.75rem] text-black/60">Name</label>
                        <input
                          className="w-full rounded-2xl border border-black/15 px-3 py-2 text-[0.8rem] bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                          placeholder="Full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[0.75rem] text-black/60">Email</label>
                        <input
                          className="w-full rounded-2xl border border-black/15 px-3 py-2 text-[0.8rem] bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                          placeholder="you@example.com"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[0.75rem] text-black/60">Phone / WhatsApp</label>
                        <input
                          className="w-full rounded-2xl border border-black/15 px-3 py-2 text-[0.8rem] bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                          placeholder="+358 ..."
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[0.75rem] text-black/60">Shipping address</label>
                        <textarea
                          className="w-full rounded-2xl border border-black/15 px-3 py-2 text-[0.8rem] bg-white min-h-[60px] focus:outline-none focus:ring-2 focus:ring-black/10"
                          placeholder="Street, city, country"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {checkoutStep === 2 && (
                    <div className="space-y-4">
                      <p className="text-[0.75rem] uppercase tracking-[0.2em] text-black/50">
                        Payment method
                      </p>

                      <div className="flex gap-2">
                        {(["USDT", "Tinkoff"] ).map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={`flex-1 py-2 rounded-2xl border text-[0.8rem] transition ${
                              paymentMethod === method
                                ? "bg-black text-white border-black"
                                : "bg-white text-black border-black/20"
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>

                      {paymentMethod === "USDT" && (
                        <div className="space-y-3">
                          <div className="rounded-3xl border border-black/15 p-3 bg-white flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[0.75rem] text-black/60">Amount</p>
                              <p className="text-sm font-semibold">{popupProduct.price} USDT {currency === "RUB" ? ("(" + Math.round(popupProduct.price * usdToRub) + " ₽)") : ""}</p>
                              <p className="text-[0.7rem] text-black/50 mt-1">
                                Send only via TRC20 network.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[0.75rem] text-black/60">USDT wallet address</p>
                            <div className="flex items-center gap-2 rounded-2xl bg-white border border-black/15 px-3 py-2">
                              <div className="flex-1 text-[0.7rem] text-black/80 truncate">
                                {USDT_WALLET}
                              </div>
                              <button
                                type="button"
                                onClick={handleCopyWallet}
                                className="text-[0.7rem] px-2 py-1 rounded-xl bg-black text-white"
                              >
                                Copy
                              </button>
                            </div>
                          </div>

                          <p className="text-[0.7rem] text-black/55">
                            After sending the payment, tap Next to confirm your order.
                          </p>
                        </div>
                      )}

                      {paymentMethod === "Tinkoff" && (
  <div className="space-y-3">
    <div className="space-y-3 text-center text-[0.8rem] text-black/70 p-4 bg-white rounded-2xl border border-black/10">
      <img src="http://corporate.stankeviciusgroup.com/assets/swipe/tinkoff.png" alt="Tinkoff Logo" className="w-20 mx-auto mb-2 opacity-90" />
      <p className="text-sm font-medium">Tinkoff Payment</p>
      <p className="text-[0.75rem] text-black/60">You will be redirected to Tinkoff secure payment page.</p>
    </div>
  </div>
)}
                    </div>
                  )}

                  {checkoutStep === 3 && (
                    <div className="space-y-3 text-[0.8rem]">
                      <p className="text-[0.75rem] uppercase tracking-[0.2em] text-black/50">
                        Review
                      </p>
                      <div className="rounded-3xl border border-black/15 bg-white p-3 flex gap-3">
                        <img
                          src={popupProduct.image}
                          alt={popupProduct.title}
                          className="w-20 h-20 rounded-2xl object-cover"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{popupProduct.title}</p>
                          <p className="text-[0.75rem] text-black/60">{popupProduct.category}</p>
                          <p className="text-sm mt-1">{currency === "USD" ? "$" + convertPrice(popupProduct.price) + (paymentMethod === "Tinkoff" ? " (" + Math.round(popupProduct.price * usdToRub) + " ₽)" : "") : convertPrice(popupProduct.price) + " ₽"}</p>
                          <p className="text-sm mt-1 text-black/70"><span className="font-bold">Selected size:</span> {selectedSize || "-"}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p>
                          <span className="font-semibold">Name:</span> {name || "-"}
                        </p>
                        <p>
                          <span className="font-semibold">Email:</span> {email || "-"}
                        </p>
                        <p>
                          <span className="font-semibold">Phone:</span> {phone || "-"}
                        </p>
                        <p>
                          <span className="font-semibold">Address:</span> {address || "-"}
                        </p>
                        <p>
                          <span className="font-semibold">Payment:</span> {paymentMethod}
                        </p>
                      </div>

                      <p className="text-[0.7rem] text-black/55">
                        By placing the order, you confirm that the information is correct and agree to
                        our standard terms of purchase.
                      </p>
                    </div>
                  )}
                {/* Bottom actions */}
                </div><div className="mt-auto flex gap-2">
                  {/* Left button: Close or Back */}
                  <button
                    type="button"
                    onClick={() => {
                      if (checkoutStep > 0) {
                        setCheckoutStep((prev) => prev - 1);
                      } else {
                        setPopupProduct(null);
                      }
                    }}
                    className="flex-1 py-3 rounded-full border border-black/20 bg-white text-black text-[0.8rem] tracking-[0.2em] uppercase hover:border-black"
                  >
                    {checkoutStep > 0 ? "Back" : "Close"}
                  </button>

                  {/* Right button: Next or Place Order */}
                  <button
                    type="button"
                    onClick={async () => {
                      // removed Tinkoff redirect here so user can go to review step

                      if (checkoutStep === 3) {
                        if (paymentMethod === "Tinkoff") {
                          await handleTinkoffPay(popupProduct);
                          return;
                        }
                        handlePlaceOrder();
                      } else {
                        setCheckoutStep((prev) => Math.min(3, prev + 1));
                      }
                    }}
                    className="flex-1 py-3 rounded-full bg-black text-white text-[0.8rem] tracking-[0.2em] uppercase hover:bg-black/90"
                  >
                    {checkoutStep === 3 ? "Place order" : "Next"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
