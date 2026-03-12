import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AgreementDashboard from './digital-forms/AgreementDashboard';
import CreateAgreement from './digital-forms/CreateAgreement';
import EditAgreement from './digital-forms/EditAgreement';
import SignAgreement from './digital-forms/SignAgreement';
import AgreementSettings from './digital-forms/AgreementSettings';

const DigitalFormPage: React.FC = () => {
  return (
    <Routes>
      <Route index element={<AgreementDashboard />} />
      <Route path="create" element={<CreateAgreement />} />
      <Route path="edit/:id" element={<EditAgreement />} />
      <Route path="settings" element={<AgreementSettings />} />
      <Route path="sign/:id" element={<SignAgreement />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
};

export default DigitalFormPage;
