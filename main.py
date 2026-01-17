from fastapi import FastAPI, Request, Depends
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import datetime

from database import SessionLocal, engine, create_db_and_tables, get_db, Compound, StockSolution

# Pydantic models
class CompoundBase(BaseModel):
    abbr_name: str
    molecular_weight: float
    default_conc_mM: float
    default_conc_mg_ml: float
    default_volume: float

class CompoundCreate(CompoundBase):
    pass

class CompoundInDB(CompoundBase):
    id: int

    class Config:
        orm_mode = True

class StockSolutionBase(BaseModel):
    compound_name: str
    concentration_mM: float
    concentration_mg_ml: float
    volume: float
    weighed_in_mg: float

class StockSolutionCreate(StockSolutionBase):
    pass

class StockSolutionInDB(StockSolutionBase):
    id: int
    date: datetime.datetime

    class Config:
        orm_mode = True


def add_initial_data():
    db = SessionLocal()
    if db.query(Compound).count() == 0:
        compounds = [
            Compound(abbr_name="NaCl", molecular_weight=58.44, default_conc_mM=1000, default_conc_mg_ml=58.44, default_volume=100),
            Compound(abbr_name="HEPES", molecular_weight=238.3, default_conc_mM=1000, default_conc_mg_ml=238.3, default_volume=100),
            Compound(abbr_name="Tris-HCl", molecular_weight=157.6, default_conc_mM=1000, default_conc_mg_ml=157.6, default_volume=100),
        ]
        db.add_all(compounds)
        db.commit()
    db.close()

create_db_and_tables()
add_initial_data()

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request, db: Session = Depends(get_db)):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/compounds", response_model=List[CompoundInDB])
def get_compounds(db: Session = Depends(get_db)):
    compounds = db.query(Compound).all()
    return compounds

@app.post("/api/stock-solutions", response_model=StockSolutionInDB)
def create_stock_solution(solution: StockSolutionCreate, db: Session = Depends(get_db)):
    db_solution = StockSolution(**solution.dict())
    db.add(db_solution)
    db.commit()
    db.refresh(db_solution)
    return db_solution

@app.get("/api/stock-solutions", response_model=List[StockSolutionInDB])
def get_stock_solutions(db: Session = Depends(get_db)):
    solutions = db.query(StockSolution).all()
    return solutions
