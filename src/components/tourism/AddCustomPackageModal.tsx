import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  MapPin,
  Calendar,
  Sparkles,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { addCustomTourPackage, updateCustomTourPackage } from '../../services/db';
import { CustomTourPackage, PackageItineraryDay } from '../../types';

interface AddCustomPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddCustomPackageModal: React.FC<AddCustomPackageModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const {
    customTourPackages,
    setCustomTourPackages,
    editingCustomPackage,
    setEditingCustomPackage,
    deleteCustomPackageById,
  } = useData();

  const isEditing = Boolean(editingCustomPackage);

  const [packageName, setPackageName] = useState('');
  const [packageNameGujarati, setPackageNameGujarati] = useState('');
  const [packageCode, setPackageCode] = useState('');
  const [destination, setDestination] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [durationNights, setDurationNights] = useState(6);
  const [durationTextGujarati, setDurationTextGujarati] = useState('૬ રાત / ૭ દિવસ');

  // Rates
  const [priceNonAcTrain, setPriceNonAcTrain] = useState<number | ''>(14000);
  const [priceAcTrain, setPriceAcTrain] = useState<number | ''>(18000);
  const [priceFlight, setPriceFlight] = useState<number | ''>(24000);
  const [priceChildHalf, setPriceChildHalf] = useState<number | ''>(8000);

  // Gujarati Details
  const [overviewGujarati, setOverviewGujarati] = useState('');
  const [hotelCategory, setHotelCategory] = useState('3-સ્ટાર & 4-સ્ટાર પ્રીમિયમ હોટેલ સ્ટે');
  const [foodPlan, setFoodPlan] = useState('૧૦૦% શુદ્ધ શાકાહારી & જૈન ભોજન (સવાર, બપોર, સાંજ)');
  const [transportDetails, setTransportDetails] = useState('પ્રાઇવેટ એસી ગાડી / પુશબેક લક્ઝરી બસ');
  const [pickupCity, setPickupCity] = useState('વડોદરા / અમદાવાદ / સુરત');
  const [inclusionsInput, setInclusionsInput] = useState('');
  const [exclusionsInput, setExclusionsInput] = useState('');

  // Itinerary
  const [itinerary, setItinerary] = useState<PackageItineraryDay[]>([
    { day: 1, title: 'ગંતવ્ય આગમન & હોટેલ ચેક-ઇન', description: 'પિકઅપ અને હોટેલમાં આરામ.' },
    { day: 2, title: 'લોકલ સાઇટસીઇંગ & દર્શન', description: 'મુખ્ય જોવાલાયક સ્થળોની મુલાકાત.' },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingCustomPackage) {
      setPackageName(editingCustomPackage.packageName || '');
      setPackageNameGujarati(editingCustomPackage.packageNameGujarati || '');
      setPackageCode(editingCustomPackage.packageCode || '');
      setDestination(editingCustomPackage.destination || '');
      setDurationDays(editingCustomPackage.durationDays || 7);
      setDurationNights(editingCustomPackage.durationNights || 6);
      setDurationTextGujarati(editingCustomPackage.durationTextGujarati || '૬ રાત / ૭ દિવસ');
      setPriceNonAcTrain(editingCustomPackage.priceNonAcTrain ?? 14000);
      setPriceAcTrain(editingCustomPackage.priceAcTrain ?? 18000);
      setPriceFlight(editingCustomPackage.priceFlight ?? 24000);
      setPriceChildHalf(editingCustomPackage.priceChildHalf ?? 8000);
      setOverviewGujarati(editingCustomPackage.overviewGujarati || '');
      setHotelCategory(editingCustomPackage.hotelCategory || '');
      setFoodPlan(editingCustomPackage.foodPlan || '');
      setTransportDetails(editingCustomPackage.transportDetails || '');
      setPickupCity(editingCustomPackage.pickupCity || '');
      setInclusionsInput(editingCustomPackage.inclusionsGujarati?.join('\n') || '');
      setExclusionsInput(editingCustomPackage.exclusionsGujarati?.join('\n') || '');
      setItinerary(editingCustomPackage.itinerary || []);
    } else {
      setPackageName('');
      setPackageNameGujarati('');
      setPackageCode(`SZ-PKG-${Date.now().toString().slice(-4)}`);
      setDestination('કાશ્મીર / હિમાચલ');
      setDurationDays(7);
      setDurationNights(6);
      setDurationTextGujarati('૬ રાત / ૭ દિવસ');
      setPriceNonAcTrain(14000);
      setPriceAcTrain(18000);
      setPriceFlight(24000);
      setPriceChildHalf(8000);
      setOverviewGujarati('સંજરી ટૂરિઝમ (વડોદરા) પ્રસ્તુત યાદગાર ફેમિલી ટૂર.');
      setHotelCategory('3-સ્ટાર & 4-સ્ટાર પ્રીમિયમ હોટેલ');
      setFoodPlan('૧૦૦% શુદ્ધ શાકાહારી & જૈન ભોજન');
      setTransportDetails('પ્રાઇવેટ એસી ગાડી');
      setPickupCity('વડોદરા / અમદાવાદ');
      setInclusionsInput(
        'ડીલક્સ હોટેલ સ્ટે\nસવારનો નાસ્તો, બપોરે & રાત્રે શુદ્ધ શાકાહારી ભોજન\nપ્રાઇવેટ એસી સાઇટસીઇંગ વાહન\nતમામ ટોલ ટેક્સ, પાર્કિંગ & ડ્રાઇવર ખર્ચ\n૨૪ કલાક ટૂર મેનેજર સપોર્ટ'
      );
      setExclusionsInput('વ્યક્તિગત શોપિંગ અને એડવેન્ચર એક્ટિવિટી ખર્ચ\nટ્રેન / ફ્લાઇટ ટિકિટ (જો અલગથી હોય)');
      setItinerary([
        { day: 1, title: 'આગમન & હોટેલ ચેક-ઇન', description: 'પિકઅપ અને સાંજનો આરામ.' },
        { day: 2, title: 'મુખ્ય જોવાલાયક સ્થળો સાઇટસીઇંગ', description: 'આખો દિવસ દર્શન અને પ્રવાસ.' },
      ]);
    }
    setError('');
  }, [editingCustomPackage, isOpen]);

  if (!isOpen) return null;

  const handleAddDay = () => {
    setItinerary((prev) => [
      ...prev,
      {
        day: prev.length + 1,
        title: `દિવસ ${prev.length + 1} પ્રવાસ`,
        description: 'સાઇટસીઇંગ અને સાંજનો આરામ.',
      },
    ]);
  };

  const handleRemoveDay = (index: number) => {
    setItinerary((prev) => prev.filter((_, i) => i !== index).map((item, idx) => ({ ...item, day: idx + 1 })));
  };

  const handleUpdateDay = (index: number, field: 'title' | 'description', val: string) => {
    setItinerary((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageNameGujarati.trim()) {
      setError('ગુજરાતી પેકેજનું નામ દાખલ કરો (Gujarati title required)');
      return;
    }
    if (!destination.trim()) {
      setError('ગંતવ્ય સ્થળ દાખલ કરો (Destination required)');
      return;
    }

    setSaving(true);
    setError('');

    const inclusions = inclusionsInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const exclusions = exclusionsInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: Omit<CustomTourPackage, 'id' | 'createdAt' | 'updatedAt'> = {
      packageCode: packageCode.trim() || `SZ-PKG-${Date.now().toString().slice(-4)}`,
      packageName: packageName.trim() || packageNameGujarati.trim(),
      packageNameGujarati: packageNameGujarati.trim(),
      destination: destination.trim(),
      durationDays: Number(durationDays) || 1,
      durationNights: Number(durationNights) || 0,
      durationTextGujarati: durationTextGujarati.trim() || `${durationNights} રાત / ${durationDays} દિવસ`,
      priceNonAcTrain: Number(priceNonAcTrain) || 0,
      priceAcTrain: Number(priceAcTrain) || 0,
      priceFlight: Number(priceFlight) || 0,
      priceChildHalf: Number(priceChildHalf) || 0,
      overviewGujarati: overviewGujarati.trim(),
      inclusionsGujarati: inclusions,
      exclusionsGujarati: exclusions,
      itinerary,
      hotelCategory: hotelCategory.trim(),
      foodPlan: foodPlan.trim(),
      transportDetails: transportDetails.trim(),
      pickupCity: pickupCity.trim(),
    };

    try {
      if (isEditing && editingCustomPackage) {
        setCustomTourPackages((prev) =>
          prev.map((p) =>
            p.id === editingCustomPackage.id
              ? { ...p, ...payload, updatedAt: new Date().toISOString() }
              : p
          )
        );
        await updateCustomTourPackage(
          editingCustomPackage.id,
          payload,
          user?.email || 'admin@sanzari.com'
        );
      } else {
        const now = new Date().toISOString();
        const tempId = `pkg_${Date.now()}`;
        const newRecord: CustomTourPackage = {
          ...payload,
          id: tempId,
          createdAt: now,
          updatedAt: now,
        };
        setCustomTourPackages((prev) => [newRecord, ...prev]);
        await addCustomTourPackage(payload, user?.email || 'admin@sanzari.com');
      }

      setEditingCustomPackage(null);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border-2 border-zinc-900 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-white p-5 text-zinc-950 flex items-center justify-between shrink-0 border-b-2 border-zinc-900">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-950 flex items-center gap-2">
              <span>📦</span>
              {isEditing ? 'કસ્ટમ ટૂર પેકેજ સુધારો (Edit Package)' : 'નવું કસ્ટમ ટૂર પેકેજ (New Package)'}
            </h2>
            <p className="text-xs text-zinc-600 font-medium">
              ગુજરાતી પીડીએફ અને વોટ્સએપ પ્રપોઝલ માટે પેકેજ માહિતી
            </p>
          </div>

          <button
            onClick={() => {
              setEditingCustomPackage(null);
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 flex items-center justify-center text-zinc-700 hover:text-black transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl font-bold">
              {error}
            </div>
          )}

          {/* Titles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black text-zinc-900 uppercase tracking-wider block">
                પેકેજ નામ (ગુજરાતીમાં) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. શ્રી કાશ્મીર હેવન સ્પેશિયલ ફેમિલી ટૂર"
                value={packageNameGujarati}
                onChange={(e) => setPackageNameGujarati(e.target.value)}
                className="w-full text-xs font-bold text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-zinc-900 uppercase tracking-wider block">
                Package Name (English)
              </label>
              <input
                type="text"
                placeholder="e.g. Kashmir Autumn Deluxe Tour"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                className="w-full text-xs font-bold text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          {/* Destination & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black text-zinc-900 uppercase tracking-wider block">
                ગંતવ્ય સ્થળ (Destination) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. કાશ્મીર (શ્રીનગર, ગુલમર્ગ, પહેલગામ)"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full text-xs font-bold text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-zinc-900 uppercase tracking-wider block">
                સમયગાળો (Duration Text)
              </label>
              <input
                type="text"
                placeholder="e.g. ૬ રાત / ૭ દિવસ"
                value={durationTextGujarati}
                onChange={(e) => setDurationTextGujarati(e.target.value)}
                className="w-full text-xs font-bold text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-zinc-900 uppercase tracking-wider block">
                પિકઅપ સિટી (Pickup City)
              </label>
              <input
                type="text"
                placeholder="e.g. વડોદરા / અમદાવાદ / સુરત"
                value={pickupCity}
                onChange={(e) => setPickupCity(e.target.value)}
                className="w-full text-xs font-bold text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          {/* Pricing Multi-Tier */}
          <div className="bg-zinc-50 p-3.5 rounded-2xl border-2 border-zinc-900 space-y-2">
            <h4 className="text-xs font-black text-zinc-950 uppercase tracking-wider">
              ભાવ પત્રક (Rates per Person)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-zinc-700 block">
                  🚞 નોન-એસી ટ્રેન
                </label>
                <input
                  type="number"
                  value={priceNonAcTrain}
                  onChange={(e) => setPriceNonAcTrain(Number(e.target.value))}
                  className="w-full text-xs font-black text-zinc-950 bg-white border border-zinc-300 rounded-lg p-2 mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-700 block">
                  🚆 3AC ટ્રેન રેટ
                </label>
                <input
                  type="number"
                  value={priceAcTrain}
                  onChange={(e) => setPriceAcTrain(Number(e.target.value))}
                  className="w-full text-xs font-black text-zinc-950 bg-white border border-zinc-300 rounded-lg p-2 mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-700 block">
                  ✈️ ફ્લાઇટ / એર રેટ
                </label>
                <input
                  type="number"
                  value={priceFlight}
                  onChange={(e) => setPriceFlight(Number(e.target.value))}
                  className="w-full text-xs font-black text-zinc-950 bg-white border border-zinc-300 rounded-lg p-2 mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-700 block">
                  👶 બાળક (૫-૧૧ વર્ષ)
                </label>
                <input
                  type="number"
                  value={priceChildHalf}
                  onChange={(e) => setPriceChildHalf(Number(e.target.value))}
                  className="w-full text-xs font-black text-zinc-950 bg-white border border-zinc-300 rounded-lg p-2 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Overview Gujarati */}
          <div className="space-y-1">
            <label className="text-xs font-black text-zinc-950 uppercase tracking-wider block">
              પેકેજ ટૂંકી વિગત (Overview in Gujarati)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. સંજરી ટૂરિઝમ (વડોદરા) પ્રસ્તુત કાશ્મીરની અદ્ભુત સુંદરતા અને શુદ્ધ શાકાહારી ભોજન સાથેની ફેમિલી ટૂર."
              value={overviewGujarati}
              onChange={(e) => setOverviewGujarati(e.target.value)}
              className="w-full text-xs text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
            />
          </div>

          {/* Inclusions & Exclusions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black text-emerald-800 uppercase tracking-wider block">
                સમાવિષ્ટ સુવિધાઓ (Inclusions - દર લાઈનમાં એક)
              </label>
              <textarea
                rows={4}
                value={inclusionsInput}
                onChange={(e) => setInclusionsInput(e.target.value)}
                placeholder="ડીલક્સ હોટેલ સ્ટે&#10;૩ ટાઇમ શુદ્ધ શાકાહારી ભોજન&#10;પ્રાઇવેટ સાઇટસીઇંગ વાહન"
                className="w-full text-xs text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-rose-800 uppercase tracking-wider block">
                સમાવિષ્ટ નથી (Exclusions - દર લાઈનમાં એક)
              </label>
              <textarea
                rows={4}
                value={exclusionsInput}
                onChange={(e) => setExclusionsInput(e.target.value)}
                placeholder="વ્યક્તિગત શોપિંગ ખર્ચ&#10;એડવેન્ચર સ્પોર્ટ્સ ફી"
                className="w-full text-xs text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          {/* Day-by-Day Itinerary Editor */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-zinc-950 uppercase tracking-wider">
                દૈનિક કાર્યક્રમ (Day-by-Day Itinerary)
              </h4>
              <button
                type="button"
                onClick={handleAddDay}
                className="px-2.5 py-1 bg-zinc-950 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-black"
              >
                <Plus size={12} /> + દિવસ ઉમેરો
              </button>
            </div>

            <div className="space-y-2">
              {itinerary.map((day, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-50 p-3 rounded-xl border border-zinc-300 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-zinc-950 text-white shrink-0">
                        દિવસ {day.day}
                      </span>
                      <input
                        type="text"
                        value={day.title}
                        onChange={(e) => handleUpdateDay(idx, 'title', e.target.value)}
                        placeholder="દિવસનું ટાઇટલ..."
                        className="w-full text-xs font-bold text-zinc-900 bg-white border border-zinc-300 rounded-lg p-1.5"
                      />
                    </div>
                    {itinerary.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDay(idx)}
                        className="text-zinc-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={day.description}
                    onChange={(e) => handleUpdateDay(idx, 'description', e.target.value)}
                    placeholder="આજના દિવસનું સાઇટસીઇંગ અને વિગત..."
                    className="w-full text-xs text-zinc-800 bg-white border border-zinc-300 rounded-lg p-2"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setEditingCustomPackage(null);
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-zinc-950 hover:bg-black text-white text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'સેવ કરી રહ્યા છીએ...' : isEditing ? 'પેકેજ અપડેટ કરો' : 'પેકેજ સેવ કરો'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
