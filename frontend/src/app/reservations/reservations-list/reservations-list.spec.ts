import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservationsList } from './reservations-list';

describe('ReservationsList', () => {
  let component: ReservationsList;
  let fixture: ComponentFixture<ReservationsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservationsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReservationsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
