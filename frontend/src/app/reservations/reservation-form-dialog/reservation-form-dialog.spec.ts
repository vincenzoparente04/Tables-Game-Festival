import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservationFormDialog } from './reservation-form-dialog';

describe('ReservationFormDialog', () => {
  let component: ReservationFormDialog;
  let fixture: ComponentFixture<ReservationFormDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservationFormDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReservationFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
