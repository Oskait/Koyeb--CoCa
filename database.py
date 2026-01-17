from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Compound(Base):
    __tablename__ = "compounds"

    id = Column(Integer, primary_key=True, index=True)
    abbr_name = Column(String, unique=True, index=True)
    molecular_weight = Column(Float)
    default_conc_mM = Column(Float)
    default_conc_mg_ml = Column(Float)
    default_volume = Column(Float)

class StockSolution(Base):
    __tablename__ = "stock_solutions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    compound_name = Column(String)
    concentration_mM = Column(Float)
    concentration_mg_ml = Column(Float)
    volume = Column(Float)
    weighed_in_mg = Column(Float)


def create_db_and_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
