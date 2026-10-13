import { useState, useEffect, useRef, useCallback } from 'react';
import {
  QrCode, CheckCircle2, RefreshCw,
  Camera, UserCheck, ImagePlus, CameraOff, Video, VideoOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsQR from 'jsqr';
import DashboardLayout from '../components/DashboardLayout';
import { verifyQR, getAppointments } from '../api/api';

export default function ScannerPage() {
  const [tokenInput, setTokenInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [verifiedPatient, setVerifiedPatient] = useState(null);
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // Upload mode state
  const [uploadedQRPreview, setUploadedQRPreview] = useState(null);
  const [qrDecoding, setQrDecoding] = useState(false);
  const fileInputRef = useRef(null);

  // Live camera state
  const [cameraMode, setCameraMode] = useState(false); // false = upload/manual, true = live cam
  const [cameraError, setCameraError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [lastScanned, setLastScanned] = useState(null); // debounce repeated scans
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastScannedRef = useRef(null);

  useEffect(() => {
    fetchRecent();
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  // ─── Data Fetching ────────────────────────────────────────────────────────────
  async function fetchRecent() {
    setLoadingRecent(true);
    try {
      const res = await getAppointments();
      const list = res.data || [];
      const checked = list.filter(a => a.status === 'Checked In' || a.attendanceStatus === 'Checked In');
      setRecentCheckIns(checked);
    } catch {
      // silent
    } finally {
      setLoadingRecent(false);
    }
  }

  // ─── Verify Token ────────────────────────────────────────────────────────────
  async function verifyToken(token) {
    if (!token?.trim()) return;
    // Debounce: don't re-scan same token within 4 seconds
    if (lastScannedRef.current === token) return;
    lastScannedRef.current = token;
    setTimeout(() => { lastScannedRef.current = null; }, 4000);

    try {
      const res = await verifyQR({ token: token.trim() });
      toast.success(res.data.message || '✅ Patient checked in!');
      setVerifiedPatient(res.data.appointment);
      setRecentCheckIns(prev => [res.data.appointment, ...prev.filter(x => x.id !== res.data.appointment.id)]);
      setTokenInput('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid or unconfirmed QR token');
    }
  }

  async function handleVerify(e) {
    if (e) e.preventDefault();
    const token = tokenInput.trim();
    if (!token) { toast.error('Please enter appointment ID or QR token'); return; }
    setScanning(true);
    await verifyToken(token);
    setScanning(false);
  }

  function handleSimulatedScan(token) {
    setTokenInput(token);
    setTimeout(() => verifyToken(token), 400);
  }

  // ─── QR Image Upload ─────────────────────────────────────────────────────────
  function handleQRImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, etc.)');
      return;
    }

    setQrDecoding(true);
    setUploadedQRPreview(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setUploadedQRPreview(dataUrl);

      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code?.data) {
          toast.success(`📷 QR Decoded: ${code.data}`);
          setTokenInput(code.data);
          await verifyToken(code.data);
        } else {
          toast.error('❌ No QR code detected. Try a clearer image.');
        }
        setQrDecoding(false);
      };
      img.onerror = () => {
        toast.error('Failed to load image.');
        setQrDecoding(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // ─── Live Camera ─────────────────────────────────────────────────────────────
  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not access camera: ' + err.message);
      }
    }
  }

  function stopCamera() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  function scanFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code?.data) {
      // Flash green overlay on canvas
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 4;
      const loc = code.location;
      ctx.beginPath();
      ctx.moveTo(loc.topLeftCorner.x, loc.topLeftCorner.y);
      ctx.lineTo(loc.topRightCorner.x, loc.topRightCorner.y);
      ctx.lineTo(loc.bottomRightCorner.x, loc.bottomRightCorner.y);
      ctx.lineTo(loc.bottomLeftCorner.x, loc.bottomLeftCorner.y);
      ctx.closePath();
      ctx.stroke();

      verifyToken(code.data);
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }

  function toggleCameraMode() {
    if (!cameraMode) {
      // Switch to camera mode
      setCameraMode(true);
      setUploadedQRPreview(null);
      setTimeout(startCamera, 100);
    } else {
      // Switch back to upload/manual mode
      stopCamera();
      setCameraMode(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="OPD Fast Track QR Scanner & Triage Station">
      <div className="space-y-6">

        {/* Top Header Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 border border-surface-border flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Reception Automated Triage Kiosk
            </div>
            <h2 className="text-2xl font-bold text-white">Contactless OPD Check-In</h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Scan appointment QR tokens from patient mobile passes — via live camera, uploaded image, or manual Token ID.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center p-3.5 rounded-2xl bg-surface-card border border-surface-border">
              <div className="text-2xl font-bold text-cyan-400 font-mono">{recentCheckIns.length}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Checked In Today</div>
            </div>
            <div className="text-center p-3.5 rounded-2xl bg-surface-card border border-surface-border">
              <div className="text-2xl font-bold text-emerald-400 font-mono">0 sec</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Queue Verification</div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Left: Scanner Panel ── */}
          <div className="lg:col-span-6 bg-surface-card rounded-3xl p-6 border border-surface-border flex flex-col gap-5 shadow-xl">

            {/* Panel Header + Mode Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
                <Camera size={15} className="text-cyan-400" />
                {cameraMode ? 'Live Camera Feed' : 'Optical Sensor Feed'}
              </span>

              <div className="flex items-center gap-2">
                {cameraMode && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${
                    cameraActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {cameraActive ? '● LIVE' : '◌ STARTING…'}
                  </span>
                )}
                <button
                  onClick={toggleCameraMode}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    cameraMode
                      ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/40 text-red-400'
                      : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                  }`}
                >
                  {cameraMode ? <><VideoOff size={13} /> Stop Camera</> : <><Video size={13} /> Live Cam</>}
                </button>
              </div>
            </div>

            {/* Viewfinder */}
            <div className="relative rounded-2xl bg-slate-950 border-2 border-slate-800 overflow-hidden"
                 style={{ minHeight: '220px' }}>

              {/* Scanning laser line (decorative when no cam) */}
              {!cameraMode && (
                <div className="absolute inset-x-8 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#38bdf8] animate-[bounce_2.5s_infinite] z-10" />
              )}

              {/* ── CAMERA MODE ── */}
              {cameraMode ? (
                <div className="relative w-full" style={{ minHeight: '220px' }}>
                  {cameraError ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
                      <CameraOff size={40} className="text-red-400" />
                      <p className="text-red-400 text-xs font-mono leading-relaxed">{cameraError}</p>
                      <button
                        onClick={startCamera}
                        className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition-all"
                      >
                        🔄 Retry Camera
                      </button>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        className="w-full rounded-xl object-cover"
                        playsInline
                        muted
                        style={{ minHeight: '220px', background: '#0f172a' }}
                      />
                      {/* Hidden canvas for jsQR processing */}
                      <canvas ref={canvasRef} className="hidden" />

                      {/* Corner brackets overlay */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="relative w-44 h-44">
                          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 rounded-tl-md" />
                          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400 rounded-tr-md" />
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400 rounded-bl-md" />
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400 rounded-br-md" />
                          <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent animate-[bounce_2s_infinite]" />
                        </div>
                      </div>

                      <div className="absolute bottom-2 left-3 right-3 flex justify-between text-[10px] font-mono text-slate-500">
                        <span>AUTO-SCAN ACTIVE</span>
                        <span>jsQR ENGINE</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* ── UPLOAD / STATIC MODE ── */
                <div className="flex items-center justify-center" style={{ minHeight: '220px' }}>
                  {uploadedQRPreview ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                      <img
                        src={uploadedQRPreview}
                        alt="Uploaded QR"
                        className="max-h-48 object-contain rounded-xl"
                      />
                      {qrDecoding && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 rounded-xl">
                          <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                          <span className="text-cyan-400 text-xs font-mono">Decoding QR…</span>
                        </div>
                      )}
                      {!qrDecoding && (
                        <button
                          onClick={() => { setUploadedQRPreview(null); setTokenInput(''); }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-800/90 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center text-xs transition-all"
                        >✕</button>
                      )}
                    </div>
                  ) : (
                    <div className="w-44 h-44 border-2 border-dashed border-cyan-500/50 rounded-2xl flex flex-col items-center justify-center p-4 text-center">
                      <QrCode size={48} className="text-cyan-400/80 animate-pulse mb-2" />
                      <span className="text-[11px] font-mono text-slate-400">Position QR Code in Box</span>
                    </div>
                  )}
                </div>
              )}

              <div className="absolute bottom-2 left-3 right-3 flex justify-between text-[10px] font-mono text-slate-600">
                {!cameraMode && (
                  <>
                    <span>SENSOR: LENS-A1 ACTIVE</span>
                    <span>AUTOFOCUS: LOCKED</span>
                  </>
                )}
              </div>
            </div>

            {/* QR Upload Button (only in non-camera mode) */}
            {!cameraMode && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleQRImageUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={qrDecoding}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 border-dashed border-cyan-500/40 hover:border-cyan-400/80 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300 font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <ImagePlus size={18} className="group-hover:scale-110 transition-transform" />
                  {qrDecoding ? 'Scanning QR from Image…' : '📁 Upload QR Image to Scan'}
                </button>
                <p className="text-[10px] text-slate-500 text-center mt-1.5 font-mono">
                  Supports PNG, JPG, WEBP — decoded instantly client-side
                </p>
              </div>
            )}

            {/* Camera tip */}
            {cameraMode && cameraActive && (
              <p className="text-[11px] text-cyan-400/70 text-center font-mono">
                📷 Hold QR code steady inside the brackets — auto check-in on detection
              </p>
            )}

            {/* Manual Input Form */}
            <form onSubmit={handleVerify} className="space-y-3">
              <label className="block text-xs font-mono text-slate-400">Manual Appointment ID or QR Token</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <QrCode size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. APT-101 or QR-APT-101-..."
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                    className="w-full bg-surface border border-surface-border focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={scanning}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/40 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {scanning ? 'Verifying...' : 'Check-In'}
                </button>
              </div>
            </form>

            {/* Quick Test Token Chips */}
            <div className="pt-3 border-t border-surface-border/60">
              <div className="text-[11px] font-mono text-slate-500 mb-2">Simulate fast check-in for pending tickets:</div>
              <div className="flex flex-wrap gap-2">
                {['APT-101', 'APT-102', 'APT-103'].map(tok => (
                  <button
                    key={tok}
                    onClick={() => handleSimulatedScan(tok)}
                    className="px-2.5 py-1 rounded-lg bg-surface hover:bg-cyan-950/60 text-slate-400 hover:text-cyan-300 border border-surface-border text-xs font-mono transition-colors"
                  >
                    {tok} ↵
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Verification Result ── */}
          <div className="lg:col-span-6 bg-surface-card rounded-3xl p-6 border border-surface-border flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
                  <UserCheck size={16} className="text-emerald-400" /> Verification Result
                </span>
                {verifiedPatient && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                    VERIFIED
                  </span>
                )}
              </div>

              {verifiedPatient ? (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl font-bold font-mono">
                        {verifiedPatient.patientName?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <div className="text-xs font-mono text-cyan-400 font-bold">{verifiedPatient.id}</div>
                        <h3 className="text-xl font-bold text-white">{verifiedPatient.patientName}</h3>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          Attendance: <strong className="text-emerald-400">Checked In ({verifiedPatient.checkedInAt || 'Just now'})</strong>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-3 border-t border-slate-800">
                      <div>
                        <div className="text-slate-500">Attending Doctor:</div>
                        <div className="text-white font-semibold mt-0.5">{verifiedPatient.doctorName}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Department:</div>
                        <div className="text-cyan-400 font-semibold mt-0.5">{verifiedPatient.dept}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Scheduled Time:</div>
                        <div className="text-slate-300 mt-0.5">{verifiedPatient.date} @ {verifiedPatient.time}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">QR Token Ref:</div>
                        <div className="text-amber-400 font-bold mt-0.5 truncate">{verifiedPatient.qrToken || verifiedPatient.id}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-surface border border-surface-border text-xs text-slate-300 flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                    <div>
                      <strong>OPD Triage Route Cleared:</strong> Doctor {verifiedPatient.doctorName} has been alerted of patient arrival. Please direct patient to OPD Bay #3.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-surface-border flex items-center justify-center text-slate-500 mx-auto">
                    <QrCode size={28} />
                  </div>
                  <h4 className="text-base font-semibold text-white">Awaiting QR Verification</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Scan patient digital pass via live camera, upload a QR image, or enter appointment number on the left.
                  </p>
                </div>
              )}
            </div>

            {/* Recent Check-In List */}
            <div className="mt-6 pt-4 border-t border-surface-border">
              <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-400">
                <span>Recent Arrivals ({recentCheckIns.length})</span>
                <button onClick={fetchRecent} className="hover:text-white"><RefreshCw size={12} /></button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {recentCheckIns.slice(0, 4).map((a, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-surface border border-surface-border/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white">{a.patientName}</span>
                      <span className="text-slate-400 ml-2">→ {a.doctorName}</span>
                    </div>
                    <span className="text-emerald-400 font-mono text-[11px] font-semibold">
                      {a.checkedInAt || 'Checked In'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
