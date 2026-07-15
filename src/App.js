import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Navbar from './components/beranda/Navbar';
import HeroFeatures from './components/beranda/HeroFeatures';
import Programs from './components/beranda/Programs';
import WhyUs from './components/beranda/WhyUs';
import VideoSection from './components/beranda/VideoSection';
import Testimonials from './components/beranda/Testimonials';
import CTA from './components/beranda/CTA';
import Footer from './components/beranda/Footer';
import TestimoniForm from './components/beranda/TestimoniForm';

import KonsultasiPage from './components/KonsultasiPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';

import StudentLayout from './components/student/StudentLayout';
import StudentHome from './components/student/StudentHome';
import StudentProfile from './components/student/StudentProfile';
import StudentMateri from './components/student/StudentMateri';
import StudentHomework from './components/student/StudentHomework';
import StudentAbsent from './components/student/StudentAbsent';
import StudentUpdates from './components/student/StudentUpdates';
import StudentMessages from './components/student/StudentMessages';
import StudentArsip from './components/student/StudentArsip';

import TeacherLayout from './components/teacher/TeacherLayout';
import TeacherHome from './components/teacher/TeacherHome';
import TeacherAbsensiMateri from './components/teacher/TeacherAbsensiMateri';
import TeacherHomework from './components/teacher/TeacherHomework';
import TeacherListStudent from './components/teacher/TeacherListStudent';
import TeacherUpdates from './components/teacher/TeacherUpdates';
import TeacherArsipMateri from './components/teacher/TeacherArsipMateri';
import TeacherProfile from './components/teacher/TeacherProfile';
import TeacherContent from './components/teacher/TeacherContent';

import AdminLayout from './components/admin/AdminLayout';
import AdminHome from './components/admin/AdminHome';
import AdminConfirmUser from './components/admin/AdminConfirmUser';
import AdminManageUser from './components/admin/AdminManageUser';
import AdminConsulPage from './components/admin/AdminConsulPage';
import AdminMessages from './components/admin/AdminMessages';
import AdminTestimoni from './components/admin/AdminTestimoni';
import AdminPengaturanMateri from './components/admin/AdminPengaturanMateri';
import Pricelist from './components/admin/Pricelist';
import PaketSiswa from './components/admin/PaketSiswa';
import AdminUpdates from './components/admin/AdminUpdates';
import AdminProfile from './components/admin/AdminProfile';
import RecapPerubahanJadwal from './components/admin/RecapPerubahanJadwal'; // <-- import baru

import './App.css';

const HomePage = () => (
  <>
    <Navbar />
    <HeroFeatures />
    <Programs />
    <WhyUs />
    <VideoSection />
    <Testimonials />
    <CTA />
    <Footer />
  </>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/konsultasi" element={<KonsultasiPage />} />
        <Route path="/testimoni" element={<TestimoniForm />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/daftar" element={<RegisterPage />} />

        {/* Rute siswa: StudentLayout membungkus semua via <Outlet /> */}
        <Route path="/siswa" element={<StudentLayout />}>
          <Route index element={<StudentHome />} />
          <Route path="materi" element={<StudentMateri />} />
          <Route path="tugas" element={<StudentHomework />} />
          <Route path="absensi" element={<StudentAbsent />} />        
          <Route path="profil" element={<StudentProfile />} />
          <Route path="updates" element={<StudentUpdates />} />
          <Route path="pesan" element={<StudentMessages />} />
          <Route path="arsip" element={<StudentArsip />} />
        </Route>

        {/* Rute guru: TeacherLayout membungkus semua via <Outlet /> */}
        <Route path="/guru" element={<TeacherLayout />}>
          <Route index element={<TeacherHome />} />
          <Route path="absensi-materi" element={<TeacherAbsensiMateri />} />
          <Route path="tugas" element={<TeacherHomework />} />
          <Route path="daftar-siswa" element={<TeacherListStudent />} />
          <Route path="updates" element={<TeacherUpdates />} />
          <Route path="arsip-materi" element={<TeacherArsipMateri />} />
          <Route path="profil" element={<TeacherProfile />} />
          <Route path="bahan-ajar" element={<TeacherContent />} />
        </Route>

        {/* Rute admin: AdminLayout membungkus semua via <Outlet /> */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminHome />} />
          <Route path="user-baru" element={<AdminConfirmUser />} />
          <Route path="manajemen-user" element={<AdminManageUser />} />
          <Route path="konsultasi" element={<AdminConsulPage />} />
          <Route path="message" element={<AdminMessages />} />
          <Route path="testimoni" element={<AdminTestimoni />} />
          <Route path="pengaturan-materi" element={<AdminPengaturanMateri />} />
          <Route path="pricelist" element={<Pricelist />} />
          <Route path="paket-siswa" element={<PaketSiswa />} />
          <Route path="updates" element={<AdminUpdates />} />
          <Route path="profil" element={<AdminProfile />} />
          <Route path="recap-perubahan-jadwal" element={<RecapPerubahanJadwal />} /> {/* <-- tambahan */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;