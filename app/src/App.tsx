import Navigation from "./sections/Navigation";
import Hero from "./sections/Hero";
import Curriculum from "./sections/Curriculum";
import CinematicVision from "./sections/CinematicVision";
import AlumniArchives from './sections/AlumniArchives';
import Footer from './sections/Footer';
export default function App() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <Navigation />
      <Hero />
      <Curriculum />
      <CinematicVision />
       <AlumniArchives />
        <Footer />
    </div>
  );
}