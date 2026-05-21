import { useState, useRef, useEffect } from 'react';
import { Plus, FolderPlus, Pencil, Trash2, Loader2, Zap, FileSpreadsheet, Download } from 'lucide-react';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Toggle } from '../../components/ui/Toggle';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuthContext } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { useMenu } from '../../hooks/useMenu';
import { addCategory, addMenuItem, updateMenuItem, deleteMenuItem, deleteCategory, updateCategory } from '../../firebase/db';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import type { MenuItem, Category } from '../../types';


interface ItemForm {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  isVeg: boolean;
  imageUrl: string;
}

const emptyForm: ItemForm = { name: '', description: '', price: '', categoryId: '', isVeg: true, imageUrl: '' };

export default function Menu() {
  const { restaurantId, restaurant, isDemo } = useAuthContext();
  const { t } = useI18n();
  const { categories, items, loading } = useMenu(restaurantId);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [catModal, setCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [itemModal, setItemModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Bulk Import States
  const [bulkModal, setBulkModal] = useState(false);

  // Drag and Drop States
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const currency = restaurant?.currency ?? '₹';
  const filtered = activeCategory === 'all' ? items : items.filter(i => i.categoryId === activeCategory);

  async function saveCategory() {
    if (!catName.trim()) return;
    setSaving(true);
    try {
      if (!isDemo && restaurantId) {
        await addCategory(restaurantId, { name: catName.trim(), order: categories.length, isActive: true });
      }
      toast.success(t('generic.success'));
      setCatModal(false);
      setCatName('');
    } finally { setSaving(false); }
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }

  async function handleDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const reordered = [...categories];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, draggedItem);

    setDraggedIndex(null);
    setDragOverIndex(null);

    if (isDemo || !restaurantId) {
      toast.success('Categories reordered (demo)');
      return;
    }

    try {
      const promises = reordered.map((cat, idx) => {
        if (cat.order !== idx) {
          return updateCategory(restaurantId, cat.id, { order: idx });
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
      toast.success('Category order updated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update category order');
    }
  }

  function openAddItem() {
    setEditItem(null);
    setItemForm({ ...emptyForm, categoryId: categories[0]?.id ?? '' });
    setItemModal(true);
  }

  function openEditItem(item: MenuItem) {
    setEditItem(item);
    setItemForm({ name: item.name, description: item.description, price: String(item.price), categoryId: item.categoryId, isVeg: item.isVeg, imageUrl: item.imageUrl });
    setItemModal(true);
  }

  async function handleImageUpload(file: File) {
    if (isDemo) {
      toast.success('Image upload skipped in demo mode');
      return;
    }
    if (!restaurantId) return;
    setUploadPct(0);
    try {
      const url = await uploadToCloudinary(file, 'menu-items', setUploadPct);
      setItemForm(f => ({ ...f, imageUrl: url }));
    } finally { setUploadPct(null); }
  }

  async function saveItem() {
    setSaving(true);
    try {
      if (!isDemo && restaurantId) {
        const data = {
          name: itemForm.name.trim(),
          description: itemForm.description.trim(),
          price: parseFloat(itemForm.price) || 0,
          categoryId: itemForm.categoryId,
          isVeg: itemForm.isVeg,
          imageUrl: itemForm.imageUrl,
          isAvailable: true,
          order: editItem?.order ?? items.length,
          createdAt: editItem?.createdAt ?? Timestamp.now(),
        };
        if (editItem) {
          await updateMenuItem(restaurantId, editItem.id, data);
        } else {
          await addMenuItem(restaurantId, data);
        }
      }
      toast.success(t('menu.itemSaved'));
      setItemModal(false);
    } finally { setSaving(false); }
  }

  async function importItemsList(itemsToImport: Array<{ name: string, category: string, price: number, description: string, isVeg: boolean }>) {
    if (!restaurantId) return;
    
    const categoryCache: Record<string, string> = {};
    categories.forEach(c => {
      categoryCache[c.name.toLowerCase()] = c.id;
    });
    
    let currentCategoryIndex = categories.length;
    
    for (const item of itemsToImport) {
      const catKey = item.category.trim().toLowerCase();
      let catId = categoryCache[catKey];
      
      if (!catId) {
        catId = await addCategory(restaurantId, {
          name: item.category.trim(),
          order: currentCategoryIndex++,
          isActive: true
        });
        categoryCache[catKey] = catId;
      }
      
      await addMenuItem(restaurantId, {
        name: item.name.trim(),
        description: item.description.trim(),
        price: item.price,
        categoryId: catId,
        isVeg: item.isVeg,
        imageUrl: '',
        isAvailable: true,
        order: items.length,
        createdAt: Timestamp.now()
      });
    }
  }


  async function handleCsvImport(file: File) {
    if (isDemo) {
      toast.success('CSV import skipped in demo mode');
      return;
    }
    if (!restaurantId) return;
    
    setSaving(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      
      const parsedItems: Array<{ name: string, category: string, price: number, description: string, isVeg: boolean }> = [];
      let startIdx = 0;
      if (lines[0]?.toLowerCase().includes('name') || lines[0]?.toLowerCase().includes('category')) {
        startIdx = 1;
      }
      
      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
        if (cols.length < 3) continue;
        
        const name = cols[0];
        const category = cols[1];
        const price = parseFloat(cols[2]) || 0;
        const description = cols[3] ?? '';
        const isVeg = cols[4]?.toLowerCase() === 'false' ? false : true;
        
        if (name && category) {
          parsedItems.push({ name, category, price, description, isVeg });
        }
      }
      
      if (parsedItems.length === 0) {
        toast.error('No valid menu items found in CSV');
        return;
      }
      
      await importItemsList(parsedItems);
      toast.success(`Imported ${parsedItems.length} items from CSV!`);
      setBulkModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse CSV file');
    } finally {
      setSaving(false);
    }
  }

  function downloadSampleCsv() {
    const csvContent = "data:text/csv;charset=utf-8,Name,Category,Price,Description,IsVeg\nPaneer Tikka,Starters,180,Spicy grilled paneer cubes,true\nButter Chicken,Main Course,240,Classic rich tomato gravy chicken,false\nButter Naan,Breads,40,Soft buttery flatbread,true\nVirgin Mojito,Drinks,90,Refreshing lime and mint cooler,true";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "scanmenu_sample_import.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function toggleAvailable(item: MenuItem) {
    if (!isDemo && restaurantId) {
      await updateMenuItem(restaurantId, item.id, { isAvailable: !item.isAvailable });
    }
    toast.success(t('generic.success'));
  }

  async function handleDeleteItem(item: MenuItem) {
    if (!confirm(`${t('generic.delete')} "${item.name}"?`)) return;
    if (!isDemo && restaurantId) {
      await deleteMenuItem(restaurantId, item.id);
    }
    toast.success(t('menu.itemDeleted'));
  }

  async function handleDeleteCategory(cat: Category) {
    if (!confirm(`${t('generic.delete')} "${cat.name}"?`)) return;
    if (!isDemo && restaurantId) {
      await deleteCategory(restaurantId, cat.id);
    }
    toast.success(t('generic.success'));
    if (activeCategory === cat.id) setActiveCategory('all');
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      <AdminHeader title={t('header.title.menu')} />
      <div className="p-6 space-y-6">
        {/* Categories */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Categories</h3>
            <Button variant="outline" size="sm" onClick={() => setCatModal(true)}>
              <FolderPlus className="w-4 h-4" /> {t('menu.addCategory')}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* All button */}
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
                activeCategory === 'all'
                  ? 'bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.3)] text-[#22c55e]'
                  : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#a1a1aa] hover:text-white'
              }`}
            >
              All
            </button>

            {/* Draggable categories */}
            {categories.map((cat, index) => {
              const isDragging = draggedIndex === index;
              const isOver = dragOverIndex === index;
              return (
                <button
                  key={cat.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedIndex !== index && dragOverIndex !== index) {
                      setDragOverIndex(index);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverIndex === index) {
                      setDragOverIndex(null);
                    }
                  }}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-grab active:cursor-grabbing ${
                    activeCategory === cat.id
                      ? 'bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.3)] text-[#22c55e]'
                      : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#a1a1aa] hover:text-white'
                  } ${isDragging ? 'opacity-40 scale-95 border-dashed border-[#22c55e]' : ''} ${
                    isOver ? 'border-[#22c55e] bg-[#22c55e]/10 scale-105' : ''
                  }`}
                >
                  <span className="text-[#52525b] mr-0.5 select-none font-bold">⋮⋮</span>
                  {cat.name}
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteCategory(cat); }}
                    className="ml-0.5 text-[#52525b] hover:text-[#ef4444]"
                  >×</button>
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">{t('dashboard.menuItems')} ({filtered.length})</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setBulkModal(true)}>
                <Zap className="w-4 h-4 text-[#22c55e]" /> CSV Import
              </Button>
              <Button size="sm" onClick={openAddItem}>
                <Plus className="w-4 h-4" /> {t('menu.addItem')}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <UtensilsIcon />
              <p className="text-white font-medium mt-3">{t('menu.noItems')}</p>
              <Button className="mt-4" size="sm" onClick={openAddItem}><Plus className="w-4 h-4" /> {t('menu.addItem')}</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(item => {
                const cat = categories.find(c => c.id === item.categoryId);
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#1a1a1a] transition-colors duration-150 group">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#1a1a1a] shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#52525b] text-xs">No img</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${item.isVeg ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
                        <span className="text-white text-sm font-medium truncate">{item.name}</span>
                      </div>
                      {item.description && (
                        <p className="text-[#52525b] text-xs truncate mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <span className="text-[#22c55e] text-sm font-medium shrink-0">{currency}{item.price}</span>
                    {cat && <span className="text-[#52525b] text-xs bg-[#1a1a1a] px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">{cat.name}</span>}
                    <Toggle checked={item.isAvailable} onChange={() => toggleAvailable(item)} />
                    <button onClick={() => openEditItem(item)} className="p-1.5 rounded-md text-[#52525b] hover:text-[#22c55e] hover:bg-[#1a1a1a] transition-colors opacity-0 group-hover:opacity-100">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteItem(item)} className="p-1.5 rounded-md text-[#52525b] hover:text-[#ef4444] hover:bg-[#1a1a1a] transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add category modal */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title={t('menu.addCategory')}>
        <Input label={t('menu.categoryName')} placeholder="e.g. Main Course" value={catName} onChange={e => setCatName(e.target.value)} />
        <Button fullWidth className="mt-4" loading={saving} onClick={saveCategory}>{t('generic.save')}</Button>
      </Modal>

      {/* Add/Edit item modal */}
      <Modal open={itemModal} onClose={() => setItemModal(false)} title={editItem ? t('generic.edit') : t('menu.addItem')}>
        <div className="space-y-4">
          <Input label={`${t('menu.itemName')} *`} placeholder="Paneer Butter Masala" value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} />
          <Textarea label={t('menu.description')} placeholder="Creamy tomato-based curry..." value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <Input label={`${t('menu.price')} *`} type="number" placeholder="180" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} prefix={currency} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#a1a1aa]">Category</label>
            <select
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
              value={itemForm.categoryId}
              onChange={e => setItemForm(f => ({ ...f, categoryId: e.target.value }))}
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#a1a1aa]">{t('menu.isVeg')}</span>
            <Toggle checked={itemForm.isVeg} onChange={v => setItemForm(f => ({ ...f, isVeg: v }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-[#a1a1aa] block mb-1.5">{t('menu.imageUrl')}</label>
            {itemForm.imageUrl && (
              <img src={itemForm.imageUrl} className="w-20 h-20 rounded-lg object-cover mb-2" alt="preview" />
            )}
            {uploadPct !== null ? (
              <div className="flex items-center gap-2 text-sm text-[#a1a1aa]">
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading {uploadPct}%
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-sm text-[#22c55e] hover:underline"
              >
                {itemForm.imageUrl ? 'Change photo' : 'Upload photo'}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
          </div>
          <Button fullWidth loading={saving} onClick={saveItem}>{editItem ? t('generic.edit') : t('generic.add')}</Button>
        </div>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal open={bulkModal} onClose={() => setBulkModal(false)} title="⚡ CSV Import">
        <div className="space-y-4">
          <div className="text-xs text-[#a1a1aa] leading-relaxed">
            Import menu items in bulk using a simple spreadsheet. Make sure your CSV contains columns in this exact sequence:
            <br />
            <code className="text-white block mt-1.5 bg-[#1a1a1a] p-2 rounded border border-[#2a2a2a]">
              Name, Category, Price, Description, IsVeg (true/false)
            </code>
          </div>

          <div 
            onClick={() => document.getElementById('csv-file-input')?.click()}
            className="border border-dashed border-[#2a2a2a] rounded-xl bg-[#161616] p-8 text-center cursor-pointer hover:border-[#22c55e]/50 hover:bg-[#1a1a1a] transition-all flex flex-col items-center justify-center gap-2 group"
          >
            <FileSpreadsheet className="w-10 h-10 text-[#a1a1aa] group-hover:text-[#22c55e] transition-colors" />
            <span className="text-xs font-semibold text-white mt-1">Select / Drop Menu CSV file</span>
            <span className="text-[10px] text-[#52525b]">Supports .csv files</span>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleCsvImport(file);
              }}
            />
          </div>

          <Button
            variant="outline"
            fullWidth
            onClick={downloadSampleCsv}
            className="flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Sample CSV Template
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function UtensilsIcon() {
  return (
    <svg className="w-16 h-16 text-[#2a2a2a] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  );
}
