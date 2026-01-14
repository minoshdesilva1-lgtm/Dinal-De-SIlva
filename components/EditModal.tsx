import React, { useState, useEffect } from 'react';
import { FaTimes, FaUpload, FaCamera, FaTrash } from 'react-icons/fa';
import { FamilyMember, D3Member } from '../types.ts';
import { COLORS } from '../constants.ts';

interface EditModalProps {
  member: D3Member | FamilyMember;
  onSave: (id: string, updates: Partial<FamilyMember>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  canDelete: boolean;
}

const EditModal: React.FC<EditModalProps> = ({ member, onSave, onDelete, onClose, canDelete }) => {
  const [name, setName] = useState(member.name);
  const [year, setYear] = useState(member.year);
  const [relationship, setRelationship] = useState(member.relationship || '');
  const [imageUrl, setImageUrl] = useState(member.imageUrl);
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(member.id, { name, year, imageUrl, relationship });
    onClose();
  };

  const handleDelete = (e: React.MouseEvent) => {
    // Stop propagation to prevent modal backdrop click or other listeners
    e.preventDefault();
    e.stopPropagation();
    
    // Direct deletion without confirmation to ensure "it works" immediately as per user request
    onDelete(member.id);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-legacy-primary/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      <div className="relative bg-white w-full max-w-md rounded-lg shadow-2xl p-8 border border-gray-200 animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-legacy-mute hover:text-legacy-primary transition-colors"
        >
          <FaTimes size={20} />
        </button>

        <h2 className="font-serif text-2xl font-bold text-legacy-dark mb-6 text-center border-b border-gray-100 pb-4">
          Edit Family Member
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Image Uploader */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative group cursor-pointer w-32 h-32 rounded-full overflow-hidden border-4 border-legacy-light hover:border-legacy-accent transition-colors">
              <img 
                src={imageUrl} 
                alt={name} 
                className="w-full h-full object-cover transition-opacity group-hover:opacity-75"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
              Click to Upload Photo
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
      </div>
    </div>
  );
};

export default EditModal;