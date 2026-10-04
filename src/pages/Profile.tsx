import React, { useState, useEffect } from 'react';
import {
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { PageHeader } from '../components/layout/PageHeader';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { Gender } from '../types';

const GENDER_OPTIONS: Gender[] = ['Male', 'Female', 'Non-Binary', 'Prefer not to say'];

export const Profile: React.FC = () => {
  const { profile, updateProfile, isLoadingProfile } = useApp();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState<number | string>('');
  const [gender, setGender] = useState<Gender>('Prefer not to say');
  const [occupation, setOccupation] = useState('');
  const [education, setEducation] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setName(profile.name || user?.name || '');
      setEmail(profile.email || user?.email || '');
      setAge(profile.age ?? '');
      setGender(profile.gender || 'Prefer not to say');
      setOccupation(profile.occupation || '');
      setEducation(profile.education || '');
      setPhone(profile.phone || '');
      setLocation(profile.location || '');
      setBio(profile.bio || '');
    } else if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [profile, user]);

  const handleCancel = () => {
    if (profile) {
      setName(profile.name || user?.name || '');
      setEmail(profile.email || user?.email || '');
      setAge(profile.age ?? '');
      setGender(profile.gender || 'Prefer not to say');
      setOccupation(profile.occupation || '');
      setEducation(profile.education || '');
      setPhone(profile.phone || '');
      setLocation(profile.location || '');
      setBio(profile.bio || '');
    }
    setErrors({});
    setIsEditing(false);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Full Name is required';
    const emailToValidate = email.trim() || user?.email || '';
    if (!emailToValidate || !emailToValidate.includes('@')) errs.email = 'Valid email is required';
    if (!age || Number(age) <= 0 || Number(age) > 120) errs.age = 'Valid age between 1 and 120 is required';
    if (!occupation.trim()) errs.occupation = 'Occupation is required';
    if (!education.trim()) errs.education = 'Education level is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    const success = await updateProfile({
      name: name.trim(),
      email: email.trim() || user?.email || '',
      age: Number(age),
      gender,
      occupation: occupation.trim(),
      education: education.trim(),
      phone: phone.trim(),
      location: location.trim(),
      bio: bio.trim(),
    });
    setIsSaving(false);

    if (success) {
      setIsEditing(false);
    }
  };

  if (isLoadingProfile || !profile) {
    return (
      <div className="py-16 text-center text-text-secondary text-sm">
        Loading user profile...
      </div>
    );
  }

  const displayName = profile.name || user?.name || 'User Profile';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Profile"
        description="Personal details, academic background, and demographic data."
        actions={
          !isEditing ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsEditing(true)}
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
            >
              Edit Profile
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
                leftIcon={<X className="w-3.5 h-3.5" />}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                isLoading={isSaving}
                leftIcon={<Check className="w-3.5 h-3.5" />}
              >
                Save Changes
              </Button>
            </>
          )
        }
      />

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User Summary Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <div className="flex flex-col items-center text-center p-2">
              <div className="w-20 h-20 rounded-full bg-primary text-white text-2xl font-bold flex items-center justify-center shadow-md mb-3">
                {initials}
              </div>
              <h2 className="text-base font-bold text-text-primary">{profile.name}</h2>
              <p className="text-xs text-text-secondary mt-0.5">{profile.email}</p>
              <div className="mt-3">
                <Badge variant="primary" size="sm">
                  {profile.occupation}
                </Badge>
              </div>

              {/* Completion Bar */}
              <div className="w-full mt-6 pt-4 border-t border-border text-left">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-text-secondary">Profile Completeness</span>
                  <span className="font-bold text-primary">{profile.completionPercentage}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${profile.completionPercentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-text-secondary mt-2">
                  Complete all fields for accurate profile categorization.
                </p>
              </div>

              {/* Meta stats */}
              <div className="w-full mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2 text-left text-xs">
                <div>
                  <span className="text-[10px] text-text-secondary uppercase">Gender</span>
                  <p className="font-semibold text-text-primary mt-0.5">{profile.gender}</p>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary uppercase">Age</span>
                  <p className="font-semibold text-text-primary mt-0.5">{profile.age} years</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Form fields */}
        <div className="lg:col-span-2">
          <Card
            title="Profile Information"
            subtitle="Editable personal and demographic attributes"
          >
            <form onSubmit={handleSave} className="space-y-4">
              {/* Row 1: Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prof-name" className="block text-sm font-medium text-text-primary mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <input
                      id="prof-name"
                      type="text"
                      disabled={!isEditing}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`input-field ${!isEditing ? 'opacity-90' : ''}`}
                    />
                  </div>
                  {errors.name && <p className="text-[11px] text-status-danger mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="prof-email" className="block text-xs font-semibold text-text-primary mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      id="prof-email"
                      type="email"
                      disabled={!isEditing}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`input-field ${!isEditing ? 'opacity-90' : ''}`}
                    />
                  </div>
                  {errors.email && <p className="text-[11px] text-status-danger mt-1">{errors.email}</p>}
                </div>
              </div>

              {/* Row 2: Age & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prof-age" className="block text-xs font-semibold text-text-primary mb-1">
                    Age *
                  </label>
                  <input
                    id="prof-age"
                    type="number"
                    min="1"
                    max="120"
                    disabled={!isEditing}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className={`input-field ${!isEditing ? 'opacity-90' : ''}`}
                  />
                  {errors.age && <p className="text-[11px] text-status-danger mt-1">{errors.age}</p>}
                </div>

                <div>
                  <label htmlFor="prof-gender" className="block text-xs font-semibold text-text-primary mb-1">
                    Gender *
                  </label>
                  <select
                    id="prof-gender"
                    disabled={!isEditing}
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className={`input-field ${!isEditing ? 'opacity-90' : ''}`}
                  >
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Occupation & Education */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prof-occ" className="block text-xs font-semibold text-text-primary mb-1">
                    Occupation *
                  </label>
                  <input
                    id="prof-occ"
                    type="text"
                    disabled={!isEditing}
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g. Student, Researcher, Analyst"
                    className={`input-field ${!isEditing ? 'opacity-90' : ''}`}
                  />
                  {errors.occupation && (
                    <p className="text-[11px] text-status-danger mt-1">{errors.occupation}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="prof-edu" className="block text-xs font-semibold text-text-primary mb-1">
                    Education Level *
                  </label>
                  <input
                    id="prof-edu"
                    type="text"
                    disabled={!isEditing}
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder="e.g. B.S. Computer Science, M.S. Information Systems"
                    className={`input-field ${!isEditing ? 'opacity-90' : ''}`}
                  />
                  {errors.education && (
                    <p className="text-[11px] text-status-danger mt-1">{errors.education}</p>
                  )}
                </div>
              </div>

              {/* Row 4: Phone & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prof-phone" className="block text-xs font-semibold text-text-primary mb-1">
                    Phone Number
                  </label>
                  <input
                    id="prof-phone"
                    type="text"
                    disabled={!isEditing}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className={`input-field ${!isEditing ? 'opacity-90' : ''}`}
                  />
                </div>

                <div>
                  <label htmlFor="prof-loc" className="block text-xs font-semibold text-text-primary mb-1">
                    Location
                  </label>
                  <input
                    id="prof-loc"
                    type="text"
                    disabled={!isEditing}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, State / Country"
                    className={`input-field ${!isEditing ? 'opacity-90' : ''}`}
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="prof-bio" className="block text-xs font-semibold text-text-primary mb-1">
                  Professional Bio & Research Focus
                </label>
                <textarea
                  id="prof-bio"
                  rows={3}
                  disabled={!isEditing}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Brief description of your background and study objectives..."
                  className={`input-field min-h-[88px] py-2 h-auto ${!isEditing ? 'opacity-90' : ''}`}
                />
              </div>

              {isEditing && (
                <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving}>
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
