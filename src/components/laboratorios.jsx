import React from 'react';
import {
    Container, Navbar, Nav, Button, Row, Col, Card
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/laboratorios.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

// ✅ Importamos las imágenes
import AROMATMA from '../assets/img_lab/AROMATMA.PNG';
import BIO_ESSENS from '../assets/img_lab/BIO_ESSENS.PNG';
import BIOSA from '../assets/img_lab/biosa.png';
import BOIRON from '../assets/img_lab/BOIRON.PNG';
import CARLSON from '../assets/img_lab/Carlson.png';
import CATALYSIS from '../assets/img_lab/CATALYSIS.PNG';
import COLVENFAR from '../assets/img_lab/COLVENFAR.PNG';
import ECOTU from '../assets/img_lab/ECOTU.PNG';
import EL_MANA from '../assets/img_lab/EL_MANA.PNG';
import EUROETIKA from '../assets/img_lab/EUROETIKA.PNG';
import EUROLIFE from '../assets/img_lab/EUROLIFE.PNG';
import FORMULABS from '../assets/img_lab/FORMULABS.PNG';
import FUNAT from '../assets/img_lab/FUNAT.PNG';
import GUNA from '../assets/img_lab/GUNA.PNG';
import HAIKO from '../assets/img_lab/HAIKO.PNG';
import HAVVA from '../assets/img_lab/havva.png';
import HEALTY from '../assets/img_lab/HEALTY..PNG';
import HELL from '../assets/img_lab/HELL.PNG';
import HERBALMEDIK from '../assets/img_lab/HERBALMEDIK.PNG';
import HERSSEN from '../assets/img_lab/Herssen.png';
import JARROW from '../assets/img_lab/JARROW.PNG';
import KIEEL from '../assets/img_lab/Kieel-logo-blanco.png';
import LABFARVE from '../assets/img_lab/LABFARVE.PNG';
import LEBENPHARMA from '../assets/img_lab/LEBENPHARMA.PNG';
import LEDMAR from '../assets/img_lab/LEDMAR.PNG';
import LHA from '../assets/img_lab/LHA..png';
import MAGNA from '../assets/img_lab/MAGNA.PNG';
import MAGNOFARMA from '../assets/img_lab/MAGNOFARMA.PNG';
import MARNYS from '../assets/img_lab/MARNYS.PNG';
import MINERALIN from '../assets/img_lab/MINERALIN.PNG';
import MOLECULAR from '../assets/img_lab/MOLECULAR.PNG';
import NAT_HERB from '../assets/img_lab/Nat-herb.png';
import NATURAL_SYSTEMS from '../assets/img_lab/NATURAL_SYSTEMS.PNG';
import NATURAL_FRESHLY from '../assets/img_lab/natural-freshly.png';
import NATURELA from '../assets/img_lab/NATURELA.PNG';
import NEILMED from '../assets/img_lab/NEILMED.PNG';
import NUTRABIOTICS from '../assets/img_lab/NUTRABIOTICS.PNG';
import NUTRIVITA from '../assets/img_lab/nutrivita.png';
import NUTROMOL from '../assets/img_lab/nutromol-fondo-blanco.png';
import OHM from '../assets/img_lab/OHM.PNG';
import RECKEWEG from '../assets/img_lab/RECKEWEG.PNG';
import SIMILASAN from '../assets/img_lab/SIMILASAN.PNG';
import SOLARAY from '../assets/img_lab/SOLARAY.PNG';
import SOLGAR from '../assets/img_lab/SOLGAR.PNG';
import STEVIA from '../assets/img_lab/stevia.png';
import TRIVIDOL from '../assets/img_lab/trividol.png';
import UPROLAB from '../assets/img_lab/uprolab.png';
import ZACPHARMA from '../assets/img_lab/zacpharma.png';
import HEPTA from '../assets/img_lab/HEPTA.jpeg';
import ARUM from '../assets/img_lab/ARUM.jpeg';
import MUNAY from '../assets/img_lab/MUNAY.jpeg';
import NUTRAHAN from '../assets/img_lab/NUTRAHAN.jpeg';
import BOTANICA from '../assets/img_lab/BOTANICA.jpeg';
import GOING from '../assets/img_lab/GOING.jpeg';

// ✅ Array con imágenes y nombres
const laboratorios = [
    { nombre: 'Bio Essens', imagen: BIO_ESSENS },
    { nombre: 'AROMATMA', imagen: AROMATMA },
    { nombre: 'BIOSA', imagen: BIOSA },
    { nombre: 'BOIRON', imagen: BOIRON },
    { nombre: 'CARLSON', imagen: CARLSON },
    { nombre: 'CATALYSIS', imagen: CATALYSIS },
    { nombre: 'COLVENFAR', imagen: COLVENFAR },
    { nombre: 'ECOTU', imagen: ECOTU },
    { nombre: 'EL MANA', imagen: EL_MANA },
    { nombre: 'EUROETIKA', imagen: EUROETIKA },
    { nombre: 'EUROLIFE', imagen: EUROLIFE },
    { nombre: 'FORMULABS', imagen: FORMULABS },
    { nombre: 'FUNAT', imagen: FUNAT },
    { nombre: 'GUNA', imagen: GUNA },
    { nombre: 'HAIKO', imagen: HAIKO },
    { nombre: 'HAVVA', imagen: HAVVA },
    { nombre: 'HEALTY AMERICA', imagen: HEALTY },
    { nombre: 'HELL', imagen: HELL },
    { nombre: 'HERBALMEDIK', imagen: HERBALMEDIK },
    { nombre: 'HERSSEN', imagen: HERSSEN },
    { nombre: 'JARROW', imagen: JARROW },
    { nombre: 'KIEEL', imagen: KIEEL },
    { nombre: 'LABFARVE', imagen: LABFARVE },
    { nombre: 'LEBENPHARMA', imagen: LEBENPHARMA },
    { nombre: 'LEDMAR', imagen: LEDMAR },
    { nombre: 'LHA', imagen: LHA },
    { nombre: 'MAGNA TRADE', imagen: MAGNA },
    { nombre: 'MAGNOFARMA', imagen: MAGNOFARMA },
    { nombre: 'MARNYS', imagen: MARNYS },
    { nombre: 'MINERALIN', imagen: MINERALIN },
    { nombre: 'MOLECULAR', imagen: MOLECULAR },
    { nombre: 'NAT HERB', imagen: NAT_HERB },
    { nombre: 'MILLENIUM', imagen: NATURAL_SYSTEMS },
    { nombre: 'NATURAL FRESHLY', imagen: NATURAL_FRESHLY },
    { nombre: 'NATURELA', imagen: NATURELA },
    { nombre: 'NEILMED', imagen: NEILMED },
    { nombre: 'NUTRABIOTICS', imagen: NUTRABIOTICS },
    { nombre: 'NUTRIVITA', imagen: NUTRIVITA },
    { nombre: 'NUTROMOL', imagen: NUTROMOL },
    { nombre: 'OHM', imagen: OHM },
    { nombre: 'RECKEWEG', imagen: RECKEWEG },
    { nombre: 'SIMILASAN', imagen: SIMILASAN },
    { nombre: 'SOLARAY', imagen: SOLARAY },
    { nombre: 'SOLGAR', imagen: SOLGAR },
    { nombre: 'STEVIA', imagen: STEVIA },
    { nombre: 'TRIVIDOL', imagen: TRIVIDOL },
    { nombre: 'UPROLAB', imagen: UPROLAB },
    { nombre: 'ZACPHARMA', imagen: ZACPHARMA },
    { nombre: 'HEPTA', imagen: HEPTA },
    { nombre: 'ARUM', imagen: ARUM },
    { nombre: 'NUTRAHAN', imagen: NUTRAHAN },
    { nombre: 'MUNAY', imagen: MUNAY },
    { nombre: 'BOTANICA', imagen: BOTANICA },
    { nombre: 'GOING', imagen: GOING },
];

const Laboratorios = () => {
    const navigate = useNavigate();

    const handleLaboratorioClick = (nombre) => {
        navigate(`/productoporlaboratorio/${encodeURIComponent(nombre)}`);
    };

    // ✅ Botones de navegación
    const handleGoToVademecum = () => navigate('/vademecum');
    const handleGoToCapacitacion = () => navigate('/capacitacion');
    const handleGoToDocs = () => navigate('/clientedoc');

    return (
        <div className="laboratorios-layout">
            {/* ✅ HEADER con botones */}
            <Navbar expand="lg" className="cliente-header" variant="dark">
                <Container fluid>
                    <Navbar.Brand className="d-flex align-items-center">
                        <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
                        <span className="cliente-title">BIBLIOTECALFH</span>
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="navbarResponsive" />
                    <Navbar.Collapse id="navbarResponsive" className="justify-content-end">
                        <Nav className="d-flex flex-column flex-lg-row gap-2">
                            <Button onClick={handleGoToVademecum}>
                                <i className="bi bi-book me-1"></i> Vademécum
                            </Button>
                            <Button onClick={handleGoToCapacitacion}>
                                <i className="bi bi-mortarboard me-1"></i> Capacitación
                            </Button>
                            <Button onClick={handleGoToDocs}>
                                <i className="bi bi-file-earmark-text me-1"></i> Documentos
                            </Button>
                            <Button onClick={() => navigate('/cliente')} variant="secondary">
                                <i className="bi bi-arrow-left-circle me-1"></i> Productos
                            </Button>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            {/* ✅ CONTENIDO */}
            <Container fluid className="laboratorios-content px-3 px-md-5">
                <h2 className="laboratorios-title text-center my-4">Laboratorios</h2>
                <Row className="g-4">
                    {laboratorios.map((lab, index) => (
                        <Col key={index} xs={6} sm={4} md={3} lg={2}>
                            <Card
                                onClick={() => handleLaboratorioClick(lab.nombre)}
                                className="laboratorio-card h-100 shadow-sm"
                                style={{ cursor: 'pointer' }}
                            >
                                <Card.Img
                                    variant="top"
                                    src={lab.imagen}
                                    alt={lab.nombre}
                                    className="laboratorio-img"
                                />
                                <Card.Body className="p-2 text-center">
                                    <h6 className="laboratorio-nombre">{lab.nombre}</h6>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Container>

            <footer className="documentos-footer text-center py-3">
                © 2025 Farmacia Homeopática - Más alternativas, más servicio.
            </footer>
        </div>

    );
};

export default Laboratorios;
