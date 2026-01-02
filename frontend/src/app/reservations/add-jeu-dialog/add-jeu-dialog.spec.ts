import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddJeuDialog } from './add-jeu-dialog';

describe('AddJeuDialog', () => {
  let component: AddJeuDialog;
  let fixture: ComponentFixture<AddJeuDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddJeuDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddJeuDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
