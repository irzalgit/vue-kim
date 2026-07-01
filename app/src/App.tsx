import  Navigation from './sections/Navigation';
import Hero from './sections/Hero';
import Curriculum from './sections/Curriculum';
import CinematicVision from './sections/CinematicVision';
import AlumniArchives from './sections/AlumniArchives';
import Footer from './sections/Footer';
import CapabilityDetail from './sections/CapabilityDetail';
import Agent from './sections/Agent';

export default function App() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <Navigation />
      <Hero />
      <Curriculum />
      <CinematicVision />
<Agent /> 

    <Footer/>
    </div>
  );
}
