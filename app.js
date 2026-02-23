const { useState, useRef, useEffect } = React;

// 這裡定義我們要用的圖示元件 (使用 Lucide)
const Icon = ({ name, className }) => {
  useEffect(() => {
    lucide.createIcons();
  }, [name]);
  return <i data-lucide={name} className={className}></i>;
};

function App() {
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);
  const fileInputRef = useRef(null);
  const apiKey = ""; // 執行環境會自動填入

  const callGemini = async (payload, retries = 5, delay = 1000) => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('API Failed');
      return await response.json();
    } catch (error) {
      if (retries > 0) {
        await new Promise(res => setTimeout(res, delay));
        return callGemini(payload, retries - 1, delay * 2);
      }
      throw error;
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        const base64 = reader.result.split(',')[1];
        processImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64) => {
    setStatus('processing');
    const prompt = "請分析此圖。若為菜單請直譯；若為商品請提供品牌、名、售價區間、優缺點、社群評價。請回傳 JSON 格式。";
    try {
      const result = await callGemini({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: base64 } }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
      setData(JSON.parse(result.candidates[0].content.parts[0].text));
      setStatus('result');
    } catch (e) { setStatus('error'); }
  };

  return (
    <div className="min-h-screen bg-[#F2E9E4] text-[#4A4E69] pb-12">
      <header className="p-6 flex justify-end">
        <div className="bg-white/60 rounded-full px-5 py-1.5 text-[10px] font-bold text-[#9A8C98] tracking-widest uppercase">Travel Pilot AI</div>
      </header>

      <main className="px-6 flex flex-col items-center justify-center min-h-[70vh]">
        {status === 'idle' && (
          <div className="text-center space-y-12 w-full max-w-sm">
            <h1 className="text-4xl font-black tracking-tight flex items-center justify-center gap-2">
              <Icon name="sparkles" className="w-6 h-6 text-[#C9ADA7]" />
              旅遊領航員
              <Icon name="sparkles" className="w-6 h-6 text-[#C9ADA7]" />
            </h1>
            <div onClick={() => fileInputRef.current.click()} className="p-10 rounded-[3rem] bg-white border-4 border-white shadow-xl cursor-pointer">
              <div className="w-24 h-24 rounded-full bg-[#F2E9E4] flex items-center justify-center mx-auto mb-6">
                <Icon name="camera" className="w-10 h-10 text-[#C9ADA7]" />
              </div>
              <div className="bg-[#4A4E69] text-white px-10 py-4 rounded-2xl font-bold">拍照或選取影像</div>
            </div>
          </div>
        )}

        {status === 'processing' && <div className="animate-pulse flex flex-col items-center space-y-4"><Icon name="refresh-cw" className="w-10 h-10 animate-spin text-[#C9ADA7]" /><p>正在導航中...</p></div>}

        {status === 'result' && data && (
          <div className="w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl p-8">
            <div className="relative h-40 -mx-8 -mt-8 mb-8 overflow-hidden">
                <img src={image} className="w-full h-full object-cover opacity-80" />
                <button onClick={() => setStatus('idle')} className="absolute top-4 right-4 bg-white/50 p-2 rounded-full"><Icon name="x" className="w-4 h-4" /></button>
            </div>
            {data.type === 'menu' ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-center">{data.title}</h2>
                {data.sections.map((s, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-[10px] font-black text-[#C9ADA7] tracking-widest uppercase">● {s.category}</p>
                    {s.items.map((item, j) => (
                      <div key={j} className="flex justify-between text-sm">
                        <span>{item.name}</span><span className="font-bold text-[#C9ADA7]">{item.price}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <h2 className="text-2xl font-black">{data.name}</h2>
                <div className="bg-[#F2E9E4] p-4 rounded-2xl text-xs leading-relaxed italic">「{data.marketReview}」</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-[#F2E9E4]/50 p-3 rounded-xl"><strong>優點：</strong>{data.userFeedback.pros[0]}</div>
                    <div className="bg-[#9A8C98]/10 p-3 rounded-xl"><strong>點評：</strong>{data.userFeedback.cons[0]}</div>
                </div>
              </div>
            )}
            <button onClick={() => setStatus('idle')} className="w-full mt-8 bg-[#4A4E69] text-white py-4 rounded-2xl font-bold">重新掃描</button>
          </div>
        )}
      </main>
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
