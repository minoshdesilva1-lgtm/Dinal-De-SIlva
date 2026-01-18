import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { FaTimes, FaCamera, FaTrash, FaCheck, FaSearchMinus, FaSearchPlus, FaUndo } from 'react-icons/fa';
import { FamilyMember, D3Member } from '../types.ts';
import { COLORS } from '../constants.ts';

interface EditModalProps {
  member: D3Member | FamilyMember;
  onSave: (id: string, updates: Partial<FamilyMember>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  canDelete: boolean;
}

const VIEWPORT_SIZE = 240;

const ImageCropper = ({ src, onConfirm, onCancel }: { src: string, onConfirm: (s: string) => void, onCancel: () => void }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Image natural dimensions
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  // Base rendered dimensions (at zoom 1) to cover the viewport
  const [baseSize, setBaseSize] = useState({ w: 0, h: 0 });

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    setNaturalSize({ w: nw, h: nh });

    // Calculate base size to "cover" the viewport
    const aspect = nw / nh;
    let bw, bh;
    
    if (aspect > 1) {
      // Landscape: Height matches viewport, Width is larger
      bh = VIEWPORT_SIZE;
      bw = VIEWPORT_SIZE * aspect;
    } else {
      // Portrait or Square: Width matches viewport, Height is larger
      bw = VIEWPORT_SIZE;
      bh = VIEWPORT_SIZE / aspect;
    }
    setBaseSize({ w: bw, h: bh });
  };

  // Drag Logic
  const handleMouseDown = (e: ReactMouseEvent | ReactTouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as ReactMouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as ReactMouseEvent).clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMouseMove = (e: ReactMouseEvent | ReactTouchEvent) => {
    if (!isDragging) return;
    e.preventDefault(); 
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as ReactMouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as ReactMouseEvent).clientY;
    
    let newX = clientX - dragStart.x;
    let newY = clientY - dragStart.y;

    // Constraint Logic: Don't let the empty space show inside the viewport
    // Current Dimensions
    const curW = baseSize.w * zoom;
    const curH = baseSize.h * zoom;
    
    // Max offset allowed (positive and negative)
    // The center of the image relative to center of viewport
    // Edge of image is at center + curW/2. Viewport edge is viewport/2.
    // We want center + curW/2 >= viewport/2  => center >= viewport/2 - curW/2
    // So max offset (right/down) is (curW - VIEWPORT_SIZE)/2
    const maxX = (curW - VIEWPORT_SIZE) / 2;
    const maxY = (curH - VIEWPORT_SIZE) / 2;

    newX = Math.max(-maxX, Math.min(maxX, newX));
    newY = Math.max(-maxY, Math.min(maxY, newY));

    setOffset({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = () => {
    const canvas = document.createElement('canvas');
    // Set output resolution (e.g. 400x400 for good quality)
    const outputSize = 400; 
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || !imgRef.current) return;

    // Calculate source rectangle
    // We need to map the Viewport rectangle (0,0, VIEWPORT, VIEWPORT) relative to the Rendered Image
    // Rendered Image TopLeft relative to Viewport TopLeft:
    // Center of Viewport is (VIEWPORT/2, VIEWPORT/2)
    // Center of Image is (VIEWPORT/2 + offset.x, VIEWPORT/2 + offset.y)
    // TopLeft of Image is (CenterImageX - CurW/2, CenterImageY - CurH/2)
    // = (VIEWPORT/2 + offset.x - CurW/2, ...)
    
    const curW = baseSize.w * zoom;
    const curH = baseSize.h * zoom;
    
    const imgRenderedX = (VIEWPORT_SIZE / 2) + offset.x - (curW / 2);
    const imgRenderedY = (VIEWPORT_SIZE / 2) + offset.y - (curH / 2);

    // The Viewport starts at (0,0) in viewport space.
    // In Rendered Image space, the Viewport starts at (-imgRenderedX, -imgRenderedY).
    const cropStartX_Rendered = -imgRenderedX;
    const cropStartY_Rendered = -imgRenderedY;

    // Scale factor from Rendered -> Natural
    const scale = naturalSize.w / curW;

    const sx = cropStartX_Rendered * scale;
    const sy = cropStartY_Rendered * scale;
    const sw = VIEWPORT_SIZE * scale;
    const sh = VIEWPORT_SIZE * scale;

    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, outputSize, outputSize);
    
    onConfirm(canvas.toDataURL('image/jpeg', 0.9));
  };

  // Reset if zoom changes causing out of bounds
  useEffect(() => {
    // Re-run constraint logic simply by clamping current offset
    if(baseSize.w === 0) return;
    
    const curW = baseSize.w * zoom;
    const curH = baseSize.h * zoom;
    const maxX = (curW - VIEWPORT_SIZE) / 2;
    const maxY = (curH - VIEWPORT_SIZE) / 2;
    
    setOffset(prev => ({
        x: Math.max(-maxX, Math.min(maxX, prev.x)),
        y: Math.max(-maxY, Math.min(maxY, prev.y))
    }));
  }, [zoom, baseSize]);

  return (
    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
        <h3 className="font-serif text-lg font-bold text-legacy-dark mb-4">Crop Profile Picture</h3>
        
        {/* Cropper Viewport */}
        <div 
            className="relative overflow-hidden bg-gray-900 shadow-inner cursor-move group"
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, borderRadius: '50%' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
        >
             {/* Image */}
             <img 
                ref={imgRef}
                src={src}
                alt="Crop target"
                onLoad={handleImageLoad}
                draggable={false}
                style={{
                    width: baseSize.w * zoom,
                    height: baseSize.h * zoom,
                    maxWidth: 'none',
                    maxHeight: 'none',
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    objectFit: 'fill', // We handle sizing manually
                    pointerEvents: 'none', // Let container handle events
                    userSelect: 'none'
                }}
             />
             
             {/* Grid Overlay for visual aid */}
             <div className="absolute inset-0 pointer-events-none opacity-30"
                  style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '33% 33%' }}
             ></div>
        </div>
        
        <p className="text-[10px] text-legacy-mute mt-2 uppercase tracking-widest">Drag to Reposition</p>

        {/* Controls */}
        <div className="w-full px-8 mt-4 space-y-4">
            <div className="flex items-center gap-3 text-legacy-primary">
                <FaSearchMinus size={12} />
                <input 
                    type="range" 
                    min="1" 
                    max="3" 
                    step="0.01" 
                    value={zoom} 
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-legacy-primary"
                />
                <FaSearchPlus size={12} />
            </div>
        </div>

        {/* Actions */}
        <div className="flex w-full gap-4 mt-6">
            <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded text-legacy-mute hover:bg-gray-50 transition-colors font-serif font-bold text-xs tracking-wide"
            >
                CANCEL
            </button>
            <button
                type="button"
                onClick={handleCrop}
                className="flex-1 px-4 py-2 bg-legacy-primary text-white rounded hover:bg-legacy-dark transition-colors font-serif font-bold text-xs tracking-wide shadow-md flex items-center justify-center gap-2"
            >
                <FaCheck /> APPLY
            </button>
        </div>
    </div>
  );
};

const EditModal: React.FC<EditModalProps> = ({ member, onSave, onDelete, onClose, canDelete }) => {
  const [name, setName] = useState(member.name);
  const [year, setYear] = useState(member.year);
  const [relationship, setRelationship] = useState(member.relationship || '');
  const [imageUrl, setImageUrl] = useState(member.imageUrl);
  
  // Cropper State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Instead of setting imageUrl directly, set it to crop state
        setImageToCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset value so same file can be selected again if needed
    e.target.value = '';
  };

  const handleCropConfirm = (croppedUrl: string) => {
      setImageUrl(croppedUrl);
      setImageToCrop(null);
  };

  const handleCropCancel = () => {
      setImageToCrop(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(member.id, { name, year, imageUrl, relationship });
    onClose();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(member.id);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-legacy-primary/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      <div className="relative bg-white w-full max-w-md rounded-lg shadow-2xl p-8 border border-gray-200 animate-in fade-in zoom-in duration-200">
        
        {!imageToCrop && (
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-legacy-mute hover:text-legacy-primary transition-colors"
            >
                <FaTimes size={20} />
            </button>
        )}

        {/* --- CROPPER MODE --- */}
        {imageToCrop ? (
            <ImageCropper 
                src={imageToCrop} 
                onConfirm={handleCropConfirm} 
                onCancel={handleCropCancel} 
            />
        ) : (
            /* --- NORMAL FORM MODE --- */
            <>
                <h2 className="font-serif text-2xl font-bold text-legacy-dark mb-6 text-center border-b border-gray-100 pb-4">
                Edit Family Member
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Image Uploader */}
                <div className="flex flex-col items-center justify-center">
                    <div className="relative group cursor-pointer w-32 h-32 rounded-full overflow-hidden border-4 border-legacy-light hover:border-legacy-accent transition-colors bg-gray-100">
                        <img 
                            src={imageUrl} 
                            alt={name} 
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <FaCamera className="text-white drop-shadow-md" size={24} />
                        </div>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                    <span className="mt-2 text-xs font-serif text-legacy-mute tracking-widest uppercase">
                    Click to Upload & Crop
                    </span>
                </div>

                {/* Fields */}
                <div className="space-y-4">
                    <div>
                    <label className="block text-xs font-bold text-legacy-mute uppercase tracking-wider mb-1">
                        Full Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded focus:ring-2 focus:ring-legacy-accent focus:border-transparent outline-none font-serif placeholder-gray-400"
                        placeholder="Enter name"
                    />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-legacy-mute uppercase tracking-wider mb-1">
                        Relationship
                        </label>
                        <input
                        type="text"
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded focus:ring-2 focus:ring-legacy-accent focus:border-transparent outline-none font-sans placeholder-gray-400"
                        placeholder="e.g. Mother"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-legacy-mute uppercase tracking-wider mb-1">
                        Birth Year
                        </label>
                        <input
                        type="text"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded focus:ring-2 focus:ring-legacy-accent focus:border-transparent outline-none font-sans placeholder-gray-400"
                        placeholder="e.g. 1955"
                        />
                    </div>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-between pt-6 mt-4 border-t border-gray-100 gap-4">
                    {canDelete ? (
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="p-3 border border-red-200 text-red-500 rounded hover:bg-red-50 hover:text-red-700 transition-colors bg-red-50/50 flex items-center justify-center"
                        title="Delete Member"
                    >
                        <FaTrash size={16} />
                    </button>
                    ) : (
                    <div className="p-3 w-10"></div>
                    )}
                    <div className="flex gap-4 flex-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded text-legacy-mute hover:bg-gray-50 transition-colors font-serif font-bold text-sm tracking-wide"
                    >
                        CANCEL
                    </button>
                    <button
                        type="submit"
                        className="flex-1 px-4 py-3 bg-legacy-primary text-white rounded hover:bg-legacy-dark transition-colors font-serif font-bold text-sm tracking-wide shadow-lg"
                    >
                        SAVE
                    </button>
                    </div>
                </div>

                </form>
            </>
        )}
      </div>
    </div>
  );
};

export default EditModal;