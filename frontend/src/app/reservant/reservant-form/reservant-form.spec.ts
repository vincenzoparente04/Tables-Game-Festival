import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservantForm } from './reservant-form';

describe('ReservantForm', () => {
  let component: ReservantForm;
  let fixture: ComponentFixture<ReservantForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservantForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReservantForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
