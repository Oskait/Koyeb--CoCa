import sys
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QTableWidget, QTableWidgetItem,
    QPushButton, QVBoxLayout, QWidget, QDialog, QLineEdit,
    QFormLayout, QDialogButtonBox, QMessageBox, QHeaderView
)
from PyQt6.QtCore import Qt

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Compound, Base

# Database setup
DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

DARK_STYLESHEET = """
QWidget{
    background-color: #353535;
    color: #F0F0F0;
    border-color: #4A4A4A;
}
QDialog{
    background-color: #353535;
}
QLineEdit {
    background-color: #4A4A4A;
    border: 1px solid #4A4A4A;
    border-radius: 4px;
    padding: 5px;
}
QTableWidget {
    background-color: #4A4A4A;
    gridline-color: #353535;
    color: #F0F0F0;
    alternate-background-color: #3A3A3A;
}
QHeaderView::section {
    background-color: #2A2A2A;
    padding: 4px;
    border: 1px solid #4A4A4A;
}
QPushButton {
    background-color: #4A4A4A;
    border: 1px solid #4A4A4A;
    padding: 5px;
    border-radius: 4px;
}
QPushButton:hover {
    background-color: #5A5A5A;
}
QMessageBox {
    background-color: #4A4A4A;
}
"""

class CompoundEditor(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Compound Database Editor")
        self.setGeometry(100, 100, 800, 600)
        self.db_session = SessionLocal()

        # Main widget and layout
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        layout = QVBoxLayout(main_widget)

        # Table
        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels([
            "ID", "Abbr. Name", "Mol. Weight", "Conc (mM)", 
            "Conc (mg/mL)", "Volume (mL)"
        ])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.table.setAlternatingRowColors(True)
        layout.addWidget(self.table)
        
        # Buttons
        add_button = QPushButton("Add Compound")
        add_button.clicked.connect(self.add_compound)
        layout.addWidget(add_button)

        delete_button = QPushButton("Delete Selected Compound")
        delete_button.clicked.connect(self.delete_compound)
        layout.addWidget(delete_button)

        self.load_data()
        self.table.itemChanged.connect(self.update_compound)

    def load_data(self):
        self.table.blockSignals(True) # Block signals during data load
        self.table.setRowCount(0)
        compounds = self.db_session.query(Compound).order_by(Compound.id).all()
        for row_idx, compound in enumerate(compounds):
            self.table.insertRow(row_idx)
            # Function to create a non-editable item
            def create_item(text):
                item = QTableWidgetItem(str(text) if text is not None else "")
                return item

            def create_non_editable_item(text):
                item = create_item(text)
                item.setFlags(item.flags() & ~Qt.ItemFlag.ItemIsEditable)
                return item

            self.table.setItem(row_idx, 0, create_non_editable_item(compound.id))
            self.table.setItem(row_idx, 1, create_item(compound.abbr_name))
            self.table.setItem(row_idx, 2, create_item(compound.molecular_weight))
            self.table.setItem(row_idx, 3, create_item(compound.default_conc_mM))
            self.table.setItem(row_idx, 4, create_item(compound.default_conc_mg_ml))
            self.table.setItem(row_idx, 5, create_item(compound.default_volume))
        self.table.blockSignals(False) # Unblock signals

    def update_compound(self, item):
        row = item.row()
        col = item.column()
        compound_id = int(self.table.item(row, 0).text())
        
        try:
            compound = self.db_session.query(Compound).filter_by(id=compound_id).one()
            
            new_value_str = item.text().strip()
            new_value = new_value_str if new_value_str else None

            header_text = self.table.horizontalHeaderItem(col).text()

            if header_text == "Abbr. Name":
                if not new_value:
                    QMessageBox.warning(self, "Update Error", "Abbreviation Name cannot be empty.")
                    self.load_data()
                    return
                compound.abbr_name = new_value
            elif header_text == "Mol. Weight":
                if not new_value:
                    QMessageBox.warning(self, "Update Error", "Molecular Weight cannot be empty.")
                    self.load_data()
                    return
                compound.molecular_weight = float(new_value)
            elif header_text == "Conc (mM)":
                compound.default_conc_mM = float(new_value) if new_value else None
            elif header_text == "Conc (mg/mL)":
                compound.default_conc_mg_ml = float(new_value) if new_value else None
            elif header_text == "Volume (mL)":
                compound.default_volume = float(new_value) if new_value else None

            self.db_session.commit()

        except ValueError:
            QMessageBox.warning(self, "Update Error", "Invalid data type. Please enter a valid number.")
            self.load_data() # Reload to revert change
        except Exception as e:
            QMessageBox.critical(self, "Update Error", f"Could not update the database: {e}")
            self.db_session.rollback()
            self.load_data()

    def add_compound(self):
        dialog = AddCompoundDialog(self)
        if dialog.exec():
            self.load_data()

    def delete_compound(self):
        selected_rows = sorted(list(set(item.row() for item in self.table.selectedItems())), reverse=True)
        if not selected_rows:
            QMessageBox.information(self, "Delete", "No compound selected.")
            return

        reply = QMessageBox.question(self, 'Delete Compound', 
            f"Are you sure you want to delete {len(selected_rows)} compound(s)?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No, QMessageBox.StandardButton.No)

        if reply == QMessageBox.StandardButton.Yes:
            try:
                for row in selected_rows:
                    compound_id = int(self.table.item(row, 0).text())
                    compound = self.db_session.query(Compound).filter_by(id=compound_id).one()
                    self.db_session.delete(compound)
                self.db_session.commit()
                self.load_data()
            except Exception as e:
                QMessageBox.critical(self, "Delete Error", f"Could not delete from the database: {e}")
                self.db_session.rollback()


class AddCompoundDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Add New Compound")
        
        self.layout = QFormLayout(self)
        
        self.abbr_name = QLineEdit()
        self.molecular_weight = QLineEdit()
        self.default_conc_mM = QLineEdit()
        self.default_conc_mg_ml = QLineEdit()
        self.default_volume = QLineEdit()

        self.layout.addRow("Abbr. Name*:", self.abbr_name)
        self.layout.addRow("Molecular Weight*:", self.molecular_weight)
        self.layout.addRow("Default Conc (mM):", self.default_conc_mM)
        self.layout.addRow("Default Conc (mg/mL):", self.default_conc_mg_ml)
        self.layout.addRow("Default Volume:", self.default_volume)

        self.buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        self.buttons.accepted.connect(self.accept)
        self.buttons.rejected.connect(self.reject)
        self.layout.addWidget(self.buttons)

    def get_float_or_none(self, line_edit):
        text = line_edit.text().strip()
        if not text:
            return None
        return float(text)

    def accept(self):
        db_session = SessionLocal()
        try:
            abbr_name_text = self.abbr_name.text().strip()
            mw_text = self.molecular_weight.text().strip()

            if not abbr_name_text:
                QMessageBox.warning(self, "Input Error", "Abbreviation Name is required.")
                return
            if not mw_text:
                QMessageBox.warning(self, "Input Error", "Molecular Weight is required.")
                return

            new_compound = Compound(
                abbr_name=abbr_name_text,
                molecular_weight=float(mw_text),
                default_conc_mM=self.get_float_or_none(self.default_conc_mM),
                default_conc_mg_ml=self.get_float_or_none(self.default_conc_mg_ml),
                default_volume=self.get_float_or_none(self.default_volume)
            )
            db_session.add(new_compound)
            db_session.commit()
            super().accept()
        except ValueError:
             QMessageBox.warning(self, "Input Error", "Please enter valid numbers for numerical fields.")
        except Exception as e:
            QMessageBox.critical(self, "Database Error", f"Could not add the compound: {e}")
            db_session.rollback()
        finally:
            db_session.close()

if __name__ == "__main__":
    Base.metadata.create_all(engine)
    app = QApplication(sys.argv)
    app.setStyleSheet(DARK_STYLESHEET)
    main_win = CompoundEditor()
    main_win.show()
    sys.exit(app.exec())